import { UserInputError } from 'apollo-server';
import prisma from '../../prisma';

const noResultsError = (recordType) => {
  throw new UserInputError(`${recordType} not found!`);
};

const getLatestMajorOccurrence = async (majorId) => {
  const majors = await prisma.major.findMany({
    where: { majorId: majorId },
    orderBy: { catalogYear: 'desc' },
    take: 1,
  });

  return majors[0] || noResultsError('major');
};

const resolvers = {
  Query: {
    major: (parent, args) => { return getLatestMajorOccurrence(args.majorId); },
  },
  Major: {
    occurrence: async (major, args) => {
      const majors = await prisma.major.findMany({
        where: { majorId: major.majorId, catalogYear: `${args.year}` },
        take: 1,
      });

      return majors[0] || noResultsError('occurrence');
    },
    latestOccurrence: (major) => { return getLatestMajorOccurrence(major.majorId); },
  },
};

export default resolvers;
