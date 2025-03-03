#include "World.h"
#include "Actor.h"
#include "SystemOutput.h"
#include "Rover.h"
#include "Obstacle.h"
#include "Destination.h"
#include "Rock.h"

#include <iostream>
#include <vector>
#include <algorithm>


World::World(int _width, int _height) : width(_width), height(_height)
{
    worldMap.resize(height, std::vector<std::vector<Actor*>>(width));
    // std::cout << "World is created.\n"; // for debugging
}

World::~World() {
    clear();
}

/**
 * @brief Prints the current state of the world to the console.
 */
void World::printWorld()
{
    for (int i = 0; i < height; i++)
    {
        for (int j = 0; j < width; j++)
        {
            if (worldMap[i][j].empty())
            {
                std::cout << ".";
            }
            else
            {
                for (const auto& actor : worldMap[i][j])
                {
                    if (actor->getType() == Actor::ActorType::PLAYER)
                    {
                        std::cout << "P";
                    }
                    else if (actor->getType() == Actor::ActorType::OBSTACLE)
                    {
                        std::cout << "O";
                    }
                    else if (actor->getType() == Actor::ActorType::DESTINATION)
                    {
                        std::cout << "D";
                    }
                    else if (actor->getType() == Actor::ActorType::ROCK)
                    {
                        std::cout << "R";
                    }
                }
            }
        }
        std::cout << std::endl;
    }
}

// MARK: - Actor actions

/**
 * @brief Adds an object of specified type and direction to the world map at the given coordinates.
 * 
 * @param actorType The type of the actor to be added (PLAYER, DESTINATION, OBSTACLE, ROCK).
 * @param actorDirection The direction the actor is facing.
 * @param x The x-coordinate (width) where the actor will be placed.
 * @param y The y-coordinate (height) where the actor will be placed.
 */
void World::addObject(Actor::ActorType actorType, Actor::ActorDirection actorDirection, int x, int y) 
{
    const int i = y; // y is the height coordinate, row in the world map
    const int j = x; // x is the width coordinate, column in the world map

    if (actorType == Actor::ActorType::PLAYER) {
        Rover* rover = new Rover(x, y, actorDirection, actorType, this);

        worldMap[i][j].push_back(rover);
    } else if (actorType == Actor::ActorType::DESTINATION) {
        Destination* destination = new Destination(x, y, actorDirection, actorType, this);

        worldMap[i][j].push_back(destination);
    } else if (actorType == Actor::ActorType::OBSTACLE) {
        Obstacle* obstacle = new Obstacle(x, y, actorDirection, actorType, this);

         worldMap[i][j].push_back(obstacle);
    } else if (actorType == Actor::ActorType::ROCK) {
        Rock* rock = new Rock(x, y, actorDirection, actorType, this);

        worldMap[i][j].push_back(rock);
        ++totalRocks;
    } else {
        std::cerr << "Wold.cpp - addObject: could not add the object" << std::endl;
    }
}

/**
 * @brief Executes the main logic for the World.
 */
void World::run() {
    bool isActorFound = false;

    for (int i = 0; i < worldMap.size(); i++)
    {
        for (int j = 0; j < worldMap[i].size(); j++) 
        {
            std::vector<Actor*> actors = worldMap[i][j];

            if (actors.empty()) continue;

            for (auto& actor : actors) {
                if (actor->getType() == Actor::ActorType::PLAYER) {
                    Rover* rover = static_cast<Rover*>(actor);
                    rover->act();
                    return;
                }
            }
        }
    }

    if (!isActorFound) {
        std::cerr << "World.cpp - run: Actor not found in the world map" << std::endl;
        return;
    }
}


/**
 * @brief Moves the specified rover to a new position on the world map.
 * 
 * @param rover The rover object to be moved.
 * @param newX The new x-coordinate to move the rover to.
 * @param newY The new y-coordinate to move the rover to.
 * 
 * @note If the rover is not found in the world map, an error message is printed to std::cerr.
 * @note If the new coordinates are out of bounds, an error message is printed to std::cerr.
 */
void World::moveObject(Rover& rover, int newX, int newY) {
    bool isActorFound = false;

    for (int i = 0; i < worldMap.size(); i++)
    {
        for (int j = 0; j < worldMap[i].size(); j++) 
        {
            auto& actors = worldMap[i][j];
            auto it = std::find_if(actors.begin(), actors.end(), [&rover](const Actor* actor) {
                return actor == &rover;
            });
            if (it != actors.end()) {
                actors.erase(it);
                isActorFound = true;
                break;
            }
        }
        if (isActorFound) break;
    }

    if (!isActorFound) {
        std::cerr << "World.cpp - moveObject: Actor not found in the world map" << std::endl;
        return;
    }

    if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
        worldMap[newY][newX].push_back(&rover);
        SystemOutput::getInstance().outputMove(newX, newY);
    } else {
        std::cerr << "World.cpp - moveObject: Invalid position (" << newX << ", " << newY << ") for moving object" << std::endl;
    }
}

/**
 * @brief Determines the success of the rover's mission.
 */
void World::determineSuccess() {
    bool reachedDestination = false;
    bool collectedAllRocks = false;
    bool gameError = false;

    /* check if the rover is at the destination */
    std::vector<int> roverPosition = findRover();

    if (roverPosition[0] == -1 && roverPosition[1] == -1) {
        std::cerr << "World.cpp - determineSuccess: Rover not found in the world map" << std::endl;
        return;
    }

    // check if game error
    Rover* rover = nullptr;
    for (int i = 0; i < worldMap.size(); i++)
    {
        for (int j = 0; j < worldMap[i].size(); j++) 
        {
            auto& actors = worldMap[i][j];
            for (auto& actor : actors) {
                if (actor->getType() == Actor::ActorType::PLAYER) {
                    rover = static_cast<Rover*>(actor);
                    if (rover->gameError) {
                        gameError = true;
                    }
                    break;
                }
            }
        }
    }

    if (!gameError) {
        reachedDestination = checkDestination(roverPosition[0], roverPosition[1]);
    }

    // check if the rover got all rocks
    if (totalRocks > 0) {
        if (collectedRocks == totalRocks) {
            collectedAllRocks = true;
        }
    }

    // output the result
    if (gameError) {
        SystemOutput::getInstance().outputInformation("Rover left the play field. Game over.");
    } else {
        if (reachedDestination) {
            if (collectedAllRocks) {
                SystemOutput::getInstance().outputInformation("Rover reached the destination and collected all rocks.");
            } else {
                SystemOutput::getInstance().outputInformation("Rover reached the destination but did not collect all rocks.");
            }
        } else {
            if (collectedAllRocks) {
                SystemOutput::getInstance().outputInformation("Rover did not reach the destination but collected all rocks.");
            } else {
                SystemOutput::getInstance().outputInformation("Rover did not reach the destination and did not collect all rocks.");
            }
        }
    }
 
    SystemOutput::getInstance().outputSuccess(reachedDestination, totalRocks , collectedRocks);
}

/**
 * @brief Finds the position of the rover (player) in the world map.
 * 
 * @return std::vector<int> A vector containing the x and y coordinates of the rover.
 */
std::vector<int> World::findRover() {
    std::vector<int> roverPosition = {-1, -1};

    for (int i = 0; i < worldMap.size(); i++)
    {
        for (int j = 0; j < worldMap[i].size(); j++) 
        {
            auto& actors = worldMap[i][j];
            for (auto& actor : actors) {
                if (actor->getType() == Actor::ActorType::PLAYER) {
                    roverPosition[0] = j;
                    roverPosition[1] = i;
                    return roverPosition;
                }
            }
        }
    }

    return roverPosition;
}

// MARK: - Getter/Setter

/**
 * @brief Retrieves a list of obstacles at the specified coordinates.
 *
 * @param x The x-coordinate in the world map.
 * @param y The y-coordinate in the world map.
 * 
 * @return A vector of pointers to Obstacle objects at the specified coordinates.
 */
std::vector<Obstacle*> World::getObstacles(int x, int y)
{
    std::vector<Obstacle*> obstacles;

    if (x < 0 || x >= width || y < 0 || y >= height) {
        std::cerr << "World.cpp - getObstacles: Invalid position (" << x << ", " << y << ") for retrieving obstacles" << std::endl;
        return obstacles;
    }

    if (worldMap[y][x].empty()) {
        return obstacles;
    }

    for (auto& actor : worldMap[y][x]) {
        if (actor->getType() == Actor::ActorType::OBSTACLE) {
            if (auto obstacle = dynamic_cast<Obstacle*>(actor)) {
                obstacles.push_back(obstacle);
            }
        }
    }

    return obstacles;
}

/**
 * @brief Checks if the specified coordinates (x, y) are a valid destination.
 * 
 * @param x The x-coordinate to check.
 * @param y The y-coordinate to check.
 * 
 * @return true if the coordinates are within bounds and contain a DESTINATION actor, false otherwise.
 */
bool World::checkDestination(int x, int y)
{
    if (x < 0 || x >= width || y < 0 || y >= height) {
        std::cerr << "World.cpp - checkDestination: Invalid position (" << x << ", " << y << ") for checking destination" << std::endl;
        return false;
    }

    for (auto& actor : worldMap[y][x]) {
        if (dynamic_cast<Destination*>(actor)) {
            return true;
        }
    }
    return false;
}

/**
 * @brief Checks if there is a Rock at the specified coordinates in the world.
 * 
 * @param x The x-coordinate of the position to check.
 * @param y The y-coordinate of the position to check.
 * 
 * @return true if there is a Rock at the specified coordinates, false otherwise.
 */
bool World::checkRock(int x, int y)
{
    if (x < 0 || x >= width || y < 0 || y >= height) {
        std::cerr << "World.cpp - checkRock: Invalid position (" << x << ", " << y << ") for checking rock" << std::endl;
        return false;
    }

    for (auto& actor : worldMap[y][x]) {
        if (dynamic_cast<Rock*>(actor)) {
            return true;
        }
    }
    return false;
}

/**
 * @brief Removes a rock from the specified position in the world.
 *
 * @param x The x-coordinate of the position from which to remove the rock.
 * @param y The y-coordinate of the position from which to remove the rock.
 */
void World::removeRock(int x, int y)
{
    if (x < 0 || x >= width || y < 0 || y >= height) {
        std::cerr << "World.cpp - removeRock: Invalid position (" << x << ", " << y << ") for removing rock" << std::endl;
        return;
    }

    std::vector<Actor*> actors = worldMap[y][x];

    for (int i = 0; i < actors.size(); i++) {
        if (actors[i]->getType() == Actor::ActorType::ROCK) {
            if (auto rock = dynamic_cast<Rock*>(actors[i])) {
                worldMap[y][x].erase(worldMap[y][x].begin() + i);
                delete rock;
                SystemOutput::getInstance().outputRemoveRock(x, y);
                ++collectedRocks;
                SystemOutput::getInstance().outputInformation("Rock removed. Total rocks collected " + std::to_string(collectedRocks) + "/" + std::to_string(totalRocks));
                return;
            }
        }
    }

    std::cerr << "World.cpp - removeRock: Rock not found at position (" << x << ", " << y << ")" << std::endl;
}

/**
 * @brief Retrieves the width of the world.
 * 
 * @return The width of the world.
 */
int World::getWidth()
{
    return width;
}

/**
 * @brief Retrieves the height of the world.
 * 
 * @return The height of the world.
 */
int World::getHeight()
{
    return height;
}

// MARK: - Clear

/**
 * @brief Clears the world map.
 * 
 */
void World::clear() {
    for (auto& row : worldMap) {
        for (auto& cell : row) {
            cell.clear();
        }
    }
    worldMap.clear();
    // std::cout << "World map cleared." << std::endl; // for debugging
}