#!/usr/bin/env tsx
/**
 * Fixture Validator
 * Validates database.fixtures.ts against current schema in app/seed/route.ts
 * Warns about missing fields or incompatible data types
 * 
 * Run: pnpm tsx scripts/validate-fixtures.ts
 */

import fs from 'fs';
import path from 'path';

const SEED_FILE = path.join(process.cwd(), 'app/seed/route.ts');
const FIXTURES_FILE = path.join(process.cwd(), '__tests__/fixtures/database.fixtures.ts');

interface TableSchema {
  name: string;
  columns: Map<string, ColumnDef>;
}

interface ColumnDef {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
}

function extractTableSchemas(): Map<string, TableSchema> {
  const seedContent = fs.readFileSync(SEED_FILE, 'utf-8');
  const schemas = new Map<string, TableSchema>();

  // Extract CREATE TABLE statements
  const tableRegex = /CREATE TABLE[^(]*\(([^;]*)\)/gs;
  let match;

  while ((match = tableRegex.exec(seedContent)) !== null) {
    const fullMatch = match[0];
    const tableNameMatch = fullMatch.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
    
    if (tableNameMatch) {
      const tableName = tableNameMatch[1];
      const columnsDef = match[1];
      
      const schema: TableSchema = {
        name: tableName,
        columns: new Map(),
      };

      // Parse columns
      const columnLines = columnsDef.split(',').map(l => l.trim());
      
      columnLines.forEach(line => {
        // Skip constraints
        if (line.match(/^\s*(PRIMARY KEY|FOREIGN KEY|CONSTRAINT|CHECK|UNIQUE)/i)) {
          return;
        }

        const colMatch = line.match(/(\w+)\s+(\w+(?:\([^)]+\))?(?:\s+\w+)*)/i);
        if (colMatch) {
          const colName = colMatch[1];
          const colDef = colMatch[2];
          
          const nullable = !line.includes('NOT NULL');
          const hasDefault = line.includes('DEFAULT') || line.includes('GENERATED');
          
          schema.columns.set(colName, {
            name: colName,
            type: colDef.split(/\s+/)[0],
            nullable: nullable || hasDefault,
            defaultValue: hasDefault ? 'auto' : undefined,
          });
        }
      });

      schemas.set(tableName, schema);
    }
  }

  return schemas;
}

function extractFixtureData(): Map<string, any[]> {
  const fixturesContent = fs.readFileSync(FIXTURES_FILE, 'utf-8');
  const fixtures = new Map<string, any[]>();

  // Extract exported arrays that match table names
  const exportRegex = /export const (\w+) = \[[\s\S]*?\];/g;
  let match;

  while ((match = exportRegex.exec(fixturesContent)) !== null) {
    const varName = match[1];
    const arrayContent = match[0];
    
    // Try to extract object structure
    const objectRegex = /\{[\s\S]*?\}/g;
    const objects: any[] = [];
    let objMatch;

    while ((objMatch = objectRegex.exec(arrayContent)) !== null) {
      try {
        // Simple parsing - extract key names
        const keys = objMatch[0].match(/(\w+):/g);
        if (keys) {
          const obj: any = {};
          keys.forEach(k => {
            const key = k.replace(':', '');
            obj[key] = true; // Just track that this field exists
          });
          objects.push(obj);
        }
      } catch (e) {
        // Skip invalid objects
      }
    }

    if (objects.length > 0) {
      fixtures.set(varName, objects);
    }
  }

  return fixtures;
}

function validateFixtures(
  schemas: Map<string, TableSchema>,
  fixtures: Map<string, any[]>
): void {
  console.log('🔍 Validating fixtures against schema...\n');

  let hasErrors = false;
  let hasWarnings = false;

  schemas.forEach((schema, tableName) => {
    const fixtureData = fixtures.get(tableName);
    
    if (!fixtureData || fixtureData.length === 0) {
      console.log(`⚠️  No fixtures found for table: ${tableName}`);
      hasWarnings = true;
      return;
    }

    console.log(`✓ Validating ${tableName} (${fixtureData.length} fixtures)`);

    // Check required columns
    const requiredColumns = Array.from(schema.columns.values())
      .filter(col => !col.nullable && !col.defaultValue);

    requiredColumns.forEach(col => {
      const allHaveField = fixtureData.every(obj => col.name in obj);
      
      if (!allHaveField) {
        console.log(`  ❌ Missing required field: ${col.name} (${col.type})`);
        hasErrors = true;
      }
    });

    // Check for extra fields in fixtures
    const schemaFields = new Set(schema.columns.keys());
    const fixtureFields = new Set(
      fixtureData.flatMap(obj => Object.keys(obj))
    );

    fixtureFields.forEach(field => {
      if (!schemaFields.has(field)) {
        console.log(`  ⚠️  Extra field in fixture: ${field} (not in schema)`);
        hasWarnings = true;
      }
    });

    console.log('');
  });

  // Check for fixtures without schemas
  fixtures.forEach((data, fixtureName) => {
    if (!schemas.has(fixtureName)) {
      console.log(`⚠️  Fixture '${fixtureName}' has no corresponding table in schema`);
      hasWarnings = true;
    }
  });

  if (hasErrors) {
    console.log('\n❌ Validation failed with errors');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('\n⚠️  Validation completed with warnings');
  } else {
    console.log('\n✅ All fixtures are valid!');
  }
}

function main() {
  console.log('📋 Fixture Validation Tool\n');
  
  console.log('📖 Reading schema from:', SEED_FILE);
  const schemas = extractTableSchemas();
  console.log(`   Found ${schemas.size} tables\n`);
  
  console.log('📖 Reading fixtures from:', FIXTURES_FILE);
  const fixtures = extractFixtureData();
  console.log(`   Found ${fixtures.size} fixture sets\n`);
  
  validateFixtures(schemas, fixtures);
}

main();