import { PrismaClient } from '@prisma/client';
import { UserInputError } from 'apollo-server';

const noResultsError = (recordType) => {
  throw new UserInputError(`${recordType} not found!`);
};

const getLatestMajorOccurrence = async (majorId) => {
  const prisma = new PrismaClient();
  const majors = await prisma.major.findMany({
    where: { majorId: majorId },
    orderBy: { catalogYear: 'desc' },
    take: 1
  });
  prisma.$disconnect();

  return majors[0] || noResultsError('major');
};

const resolvers = {
  Query: {
    major: (parent, args) => { return getLatestMajorOccurrence(args.majorId); },
  },
  Major: {
    occurrence: async (major, args) => {
      const prisma = new PrismaClient();
      const majors = await prisma.major.findMany({
        where: { majorId: major.majorId, catalogYear: `${args.year}` },
        take: 1,
      });
      prisma.$disconnect();

      return majors[0] || noResultsError('occurrence');
    },
    latestOccurrence: (major) => { return getLatestMajorOccurrence(major.majorId); },
  },
};

export default resolvers;
