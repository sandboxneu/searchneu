import { createTestClient } from 'apollo-server-testing';
import { gql } from 'apollo-server';
import prisma from '../../prisma';
import server from '../index';

const { query } = createTestClient(server);

beforeAll(async () => {
  await prisma.major.deleteMany({});

  await prisma.major.create({
    data: {
      majorId: 'computer-information-science/computer-science/bscs',
      catalogYear: '2018',
      name: 'Computer Science',
      requirements: { name: 'Computer Science, BSCS', yearVersion: 2018 },
      plansOfStudy: [{ years: [1000], id: '0' }],
    },
  });

  await prisma.major.create({
    data: {
      majorId: 'computer-information-science/computer-science/bscs',
      catalogYear: '2017',
      name: 'Computer Science',
      requirements: { name: 'Computer Science, BSCS', yearVersion: 2017 },
      plansOfStudy: [{ years: [1000], id: '0' }],
    },
  });

  await prisma.major.create({
    data: {
      majorId: 'science/biochemistry/biochemistry-bs',
      catalogYear: '2018',
      name: 'Biochemistry',
      requirements: { name: 'Biochemistry, BS', yearVersion: 2018 },
      plansOfStudy: [{ years: [1000], id: '0' }],
    },
  });
});

it('gets major from majorId', async () => {
  const res = await query({
    query: gql`
      query major {
        major(majorId: "computer-information-science/computer-science/bscs") {
          name
        }
      }
    `,
  });
  expect(res).toMatchSnapshot();
});

it('gets specific occurrence', async () => {
  const res = await query({
    query: gql`
      query major {
        major(majorId: "computer-information-science/computer-science/bscs") {
          name
          occurrence(year: 2017) {
            catalogYear
            requirements
            plansOfStudy
          }
        }
      }
    `,
  });

  expect(res).toMatchSnapshot();
});

it('gets latest occurrence', async () => {
  const res = await query({
    query: gql`
      query major {
        major(majorId: "computer-information-science/computer-science/bscs") {
          name
          latestOccurrence {
            catalogYear
            requirements
          }
        }
      }
    `,
  });
  expect(res).toMatchSnapshot();
});

it('cannot find major from non-present majorId', async () => {
  const res = await query({
    query: gql`
      query major {
        major(majorId: "humanities/lovecraftian-studies/lovecraft-studies-ba") {
          name
          latestOccurrence {
            catalogYear
          }
        }
      }
    `,
  });
  expect(res).toMatchSnapshot();
});

it('cannot find majorOccurrence from non-present year', async () => {
  const res = await query({
    query: gql`
      query major {
        major(majorId: "computer-information-science/computer-science/bscs") {
          name
          occurrence(year: 1984) {
            requirements
          }
        }
      }
    `,
  });
  expect(res).toMatchSnapshot();
});
