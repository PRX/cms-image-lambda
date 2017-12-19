FROM lambci/lambda:build-nodejs4.3

MAINTAINER PRX <sysadmin@prx.org>
LABEL org.prx.lambda="true"

WORKDIR /app
EXPOSE 8080

ENTRYPOINT [ "npm", "run" ]
CMD [ "test" ]

ADD package.json .
RUN npm install
ADD . .
RUN npm run build
