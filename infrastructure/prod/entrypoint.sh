#!/bin/sh

yarn db:migrate
yarn db:refresh


exec "$@"