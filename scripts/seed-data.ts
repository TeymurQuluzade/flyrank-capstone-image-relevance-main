import fs from "fs";
import path from "path";
import { query, closePool } from "../src/config/database";

const postsData = require("../data/posts.json") as Array<{
  title: string;
  content: string;
}>;

const imagesData = require("../data/images.json") as Array<{
  url: string;
  filename: string;
  category: string;
}>;

async function runMigration(): Promise<void> {
  const migrationPath = path.join(
    __dirname,
    "../migrations/001_initial.sql"
  );
  const sql = fs.readFileSync(migrationPath, "utf8");

  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await query(statement + ";");
  }

  console.log("Migration completed successfully");
}

async function seedPosts(): Promise<Map<string, string>> {
  const postIdMap = new Map<string, string>();

  for (const post of postsData) {
    const result = await query(
      `INSERT INTO posts (title, content) VALUES ($1, $2) RETURNING id, title`,
      [post.title, post.content]
    );
    const row = result.rows[0];
    postIdMap.set(post.title, row.id);
    console.log(`  Created post: "${post.title}" (${row.id})`);
  }

  return postIdMap;
}

async function seedImages(): Promise<Map<string, string>> {
  const imageIdMap = new Map<string, string>();

  for (const image of imagesData) {
    const result = await query(
      `INSERT INTO images (url, filename, status) VALUES ($1, $2, 'pending') RETURNING id, filename`,
      [image.url, image.filename]
    );
    const row = result.rows[0];
    imageIdMap.set(image.filename, row.id);
    console.log(`  Created image: "${image.filename}" (${row.id})`);
  }

  return imageIdMap;
}

async function run(): Promise<void> {
  console.log("=== Seeding Database ===\n");

  try {
    console.log("Running migration...");
    await runMigration();
    console.log("");

    console.log(`Seeding ${postsData.length} posts...`);
    const postIdMap = await seedPosts();
    console.log(`  Created ${postIdMap.size} posts\n`);

    console.log(`Seeding ${imagesData.length} images...`);
    const imageIdMap = await seedImages();
    console.log(`  Created ${imageIdMap.size} images\n`);

    console.log("=== Seed Complete ===");
    console.log(`Posts:  ${postIdMap.size}`);
    console.log(`Images: ${imageIdMap.size}`);
  } catch (error) {
    console.error("Seed failed:", error);
    throw error;
  } finally {
    await closePool();
  }
}

run().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
