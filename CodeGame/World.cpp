#include "World.h"
#include "Actor.h"
#include "SystemOutput.h"
#include "Rover.h"
#include "Obstacle.h"

#include <iostream>
#include <vector>
#include <algorithm>


World::World(int _width, int _height) : width(_width), height(_height)
{
    worldMap.resize(height, std::vector<std::vector<Actor*>>(width));
    std::cout << "World is created.\n";
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
                }
            }
        }
        std::cout << std::endl;
    }
}

// MARK: - Actor actions


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
    } else {
        std::cerr << "Wold.cpp - addObject: could not add the object" << std::endl;
    }
}

void World::run() {
    bool isActorFound = false;

    for (int i = 0; i < worldMap.size(); i++)
    {
        for (int j = 0; j < worldMap[i].size(); j++) 
        {
            std::vector<Actor*> actors = worldMap[i][j];

            for (auto& actor : actors) {
                if (actor->getType() == Actor::ActorType::PLAYER) {
                    Rover* rover = static_cast<Rover*>(actor);
                    rover->act();
                    isActorFound = true;
                    break;
                }
            }
        }
        if (isActorFound) break;
    }

    if (!isActorFound) {
        std::cerr << "World.cpp - run: Actor not found in the world map" << std::endl;
        return;
    }
}


void World::moveObject(Rover& rover, int newX, int newY) {
    // find the actor in the world map and replace it with the new position
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

void World::clear() {
    for (auto& row : worldMap) {
        for (auto& cell : row) {
            cell.clear();
        }
    }
    worldMap.clear();
    std::cout << "World map cleared." << std::endl;
}