#include "World.h"
#include "Actor.h"
#include "Rover.h"
#include "Destination.h"
#include "Obstacle.h"

#include <fstream>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

struct ActorData {
    std::string type;
    int x;
    int y;
    std::string direction;
};

Actor::ActorType getActorType(const std::string& type) {
    if (type == "PLAYER") return Actor::ActorType::PLAYER;
    if (type == "DESTINATION") return Actor::ActorType::DESTINATION;
    if (type == "OBSTACLE") return Actor::ActorType::OBSTACLE;
    throw std::invalid_argument("Unknown actor type");
}

Actor::ActorDirection getActorDirection(const std::string& direction) {
    if (direction == "NORTH") return Actor::ActorDirection::NORTH;
    if (direction == "EAST") return Actor::ActorDirection::EAST;
    if (direction == "SOUTH") return Actor::ActorDirection::SOUTH;
    if (direction == "WEST") return Actor::ActorDirection::WEST;
    throw std::invalid_argument("Unknown actor direction");
}

void parseTxt(const std::string& txtString, int& worldWidth, int& worldHeight, std::vector<ActorData>& actors) {
    std::istringstream stream(txtString);
    std::string line;
    while (std::getline(stream, line)) {
        std::istringstream lineStream(line);
        std::string key;
        lineStream >> key;
        if (key == "world") {
            lineStream >> worldWidth >> worldHeight;
        } else if (key == "actor") {
            ActorData actor;
            lineStream >> actor.type >> actor.x >> actor.y >> actor.direction;
            actors.push_back(actor);
        }
    }
}

/**
 * @brief Parses a grid string and extracts actor data.
 * 
 * @param gridString The string representation of the grid.
 * @param worldWidth Reference to an integer where the width of the world will be stored.
 * @param worldHeight Reference to an integer where the height of the world will be stored.
 * @param actors Reference to a vector of ActorData where the parsed actor data will be stored.
 */
void parseGrid(const std::string& gridString, int& worldWidth, int& worldHeight, std::vector<ActorData>& actors) {
    std::istringstream stream(gridString);
    std::string line;
    int y = 0;
    while (std::getline(stream, line)) {
        if (worldWidth == 0) {
            worldWidth = line.length();
        }
        for (int x = 0; x < line.length(); ++x) {
            char cell = line[x];
            if (cell == 'P' || cell == 'O' || cell == 'D') {
                ActorData actor;
                actor.type = (cell == 'P') ? "PLAYER" : (cell == 'O') ? "OBSTACLE" : "DESTINATION";
                actor.x = x;
                actor.y = y;
                actor.direction = "EAST"; // Default direction
                actors.push_back(actor);
            }
        }
        ++y;
    }
    worldHeight = y;
}

int main() {

    // MARK: - Read txt file

    std::ifstream file("game.grid.txt");
    if (!file.is_open()) {
        std::cerr << "Could not open game.grid.txt" << std::endl;
        return 1;
    }

    std::stringstream buffer;
    buffer << file.rdbuf();
    std::string txtString = buffer.str();

    int worldWidth = 0;
    int worldHeight = 0;
    std::vector<ActorData> actors;

    /*
    * Select the paring method to generate the world.
    */
    // parseTxt(txtString, worldWidth, worldHeight, actors);
    parseGrid(txtString, worldWidth, worldHeight, actors);

    World world(worldWidth, worldHeight);

    // MARK: - Creation

    for (const auto& actor : actors) {
        if (actor.type == "PLAYER") {
            Rover rover(actor.x, actor.y, getActorDirection(actor.direction), getActorType(actor.type), world);
            world.addObject(rover, rover.getX(), rover.getY());
        } else if (actor.type == "DESTINATION") {
            Destination destination(actor.x, actor.y, getActorDirection(actor.direction), getActorType(actor.type), world);
            world.addObject(destination, destination.getX(), destination.getY());
        } else if (actor.type == "OBSTACLE") {
            Obstacle obstacle(actor.x, actor.y, getActorDirection(actor.direction), getActorType(actor.type), world);
            world.addObject(obstacle, obstacle.getX(), obstacle.getY());
        }
    }

    world.printWorld();

    // MARK: - Act

    int numberOfActors = actors.size();
    bool playerFound = false;
    if (numberOfActors > 0) {
        for (int i = 0; i < numberOfActors; i++) {
            if (actors[i].type == "PLAYER") {
                Rover* player = world.getPlayer(actors[i].x, actors[i].y);
                if (player != nullptr) {
                    player->act();
                    playerFound = true;
                }
            }
        }

        if (!playerFound) {
            std::cerr << "Player not found in the world map" << std::endl;
        }
    }

    world.printWorld();

    return 0;
}