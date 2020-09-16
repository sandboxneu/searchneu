## Folders

- `graphql` contains models and resolvers for the GraphQL API consumed by external parties. We don't yet use that API ourselves.
- `libs` contains general purpose utilities that are used in many places.
- `routes` contains the express routers for our REST API. Routers are like controllers and should be kept relatively thin. Any extensive business logic should go in a Service.
- `scrapers` is the Banner v9 scraper code.
- `services` are Services containing business logic that controllers call out to. 
- `tests` self-explanatory


## Is it a Lib or Service?

Services are pieces of business logic specific to a controller route. The controller should extract everything from the HTTP layer (request) and pass data to Service to process.

Libs are general purpose layers of abstraction.