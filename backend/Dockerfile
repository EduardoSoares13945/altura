FROM maven:3.9.11-eclipse-temurin-17 AS build

WORKDIR /app
COPY pom.xml ./
RUN mvn -B dependency:go-offline

COPY src ./src
RUN mvn -B package

FROM eclipse-temurin:17-jre-alpine

RUN addgroup -S altura && adduser -S altura -G altura
WORKDIR /app

COPY --from=build /app/target/altura-api-*.jar app.jar

ENV SPRING_PROFILES_ACTIVE=prod
EXPOSE 8080

USER altura
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]

