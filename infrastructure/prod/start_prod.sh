#!/bin/sh

yarn db:migrate
yarn db:refresh
yarn prod:start
