// tests/nexus-test-environment.js
const { Client } = require('pg')
const NodeEnvironment = require('jest-environment-node')
const { v4: uuid } = require('uuid')
const util = require('util')
const exec = util.promisify(require('child_process').exec)

const prismaBinary = './node_modules/.bin/prisma'

/**
 * Custom test environment for Nexus, Prisma and Postgres
 */
class PrismaTestEnvironment extends NodeEnvironment {
  constructor(config) {
    super(config)
    // Generate a unique schema identifier for this test context
    this.schema = `test_${uuid()}`
    // Generate the pg connection string for the test schema
    this.databaseUrl = `postgres://postgres@localhost:5432/searchneu_test?schema=${this.schema}`
  }

  async setup() {
    // Set the equired environment variable to contain the connection string
    // to our database test schema
    process.env.DATABASE_URL = this.databaseUrl
    this.global.process.env.DATABASE_URL = this.databaseUrl
    // Run the migrations to ensure our schema has the required structure
    await exec(`${prismaBinary} migrate up --create-db --experimental`)
    await exec(`${prismaBinary} generate`);
    return super.setup()
  }

  async teardown() {
    // Drop the schema after the tests have completed
    const client = new Client({
      connectionString: this.databaseUrl,
    })
    await client.connect()
    await client.query(`DROP SCHEMA IF EXISTS "${this.schema}" CASCADE`)
    await client.end()
  }
}
module.exports = PrismaTestEnvironment
