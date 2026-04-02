# Use Eclipse Temurin (official OpenJDK replacement on Docker Hub)
FROM eclipse-temurin:17-jdk-jammy

WORKDIR /app

# Copy Maven wrapper and pom first for better layer caching
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline -q

# Copy source and build
COPY src ./src
RUN ./mvnw clean package -DskipTests -q

EXPOSE 8080

# DB credentials are passed at runtime via --env-file or -e flags
CMD ["java", "-jar", "target/loanapp-0.0.1-SNAPSHOT.jar"]