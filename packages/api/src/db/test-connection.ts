/**
 * Database Connection Test Script
 *
 * Run this script to verify database connectivity and schema.
 * Usage: tsx src/db/test-connection.ts
 */

import 'dotenv/config'; // Load environment variables first
import { db, testConnection } from './client';
import { sql } from 'kysely';

async function main() {
  console.log('🔍 Testing database connection...\n');

  try {
    // Test basic connection
    await testConnection();

    // Check if extensions are installed
    console.log('\n📦 Checking extensions...');
    const extensions = await sql<{ extname: string }>`
      SELECT extname FROM pg_extension
      WHERE extname IN ('uuid-ossp', 'pg_trgm')
    `.execute(db);

    console.log('   Installed extensions:', extensions.rows.map(e => e.extname).join(', '));

    // Check if all tables exist
    console.log('\n📋 Checking tables...');
    const tables = await sql<{ tablename: string }>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `.execute(db);

    console.log('   Tables found:', tables.rows.length);
    tables.rows.forEach(t => console.log('   -', t.tablename));

    // Check indexes
    console.log('\n🔍 Checking indexes...');
    const indexes = await sql<{ indexname: string, tablename: string }>`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname
    `.execute(db);

    console.log('   Indexes found:', indexes.rows.length);
    const groupedIndexes = indexes.rows.reduce((acc, idx) => {
      if (!acc[idx.tablename]) acc[idx.tablename] = [];
      acc[idx.tablename].push(idx.indexname);
      return acc;
    }, {} as Record<string, string[]>);

    Object.entries(groupedIndexes).forEach(([table, idxs]) => {
      console.log(`   ${table}:`);
      idxs.forEach(idx => console.log(`     - ${idx}`));
    });

    // Test fuzzy matching capability
    console.log('\n🔎 Testing fuzzy matching (pg_trgm)...');
    const testResult = await sql<{ similarity: number }>`
      SELECT similarity('johndoe', 'john_doe') as similarity
    `.execute(db);

    console.log('   Similarity score:', testResult.rows[0].similarity);
    console.log('   ✅ Fuzzy matching is working!');

    // Count records in each table
    console.log('\n📊 Record counts:');
    const counts = await Promise.all([
      db.selectFrom('user_sessions').select(sql`COUNT(*)`.as('count')).executeTakeFirst(),
      db.selectFrom('user_uploads').select(sql`COUNT(*)`.as('count')).executeTakeFirst(),
      db.selectFrom('source_accounts').select(sql`COUNT(*)`.as('count')).executeTakeFirst(),
      db.selectFrom('atproto_matches').select(sql`COUNT(*)`.as('count')).executeTakeFirst(),
    ]);

    console.log('   user_sessions:', counts[0]?.count ?? 0);
    console.log('   user_uploads:', counts[1]?.count ?? 0);
    console.log('   source_accounts:', counts[2]?.count ?? 0);
    console.log('   atproto_matches:', counts[3]?.count ?? 0);

    console.log('\n✅ All database checks passed!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database test failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

main();
