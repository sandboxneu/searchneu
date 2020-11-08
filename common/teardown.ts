import prisma from '../backend/prisma';

afterAll(async () => prisma.$disconnect());
