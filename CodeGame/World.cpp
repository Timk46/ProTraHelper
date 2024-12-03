#include "World.h"
#include "Actor.h"
#include "SystemOutput.h"
#include "Rover.h"
#include "Obstacle.h"

#include <iostream>
#include <vector>
#include <algorithm>

/**
 * @brief Constructs a World object with specified dimensions.
 * 
 * @param worldWidth The width of the world.
 * @param worldHeight The height of the world.
 */
World::World(int worldWidth, int worldHeight)
    : worldMap(worldHeight, std::vector<std::vector<Actor*>>(worldWidth))
{
    std::cout << "World is created.\n";
}

/**
 * @brief Prints the current state of the world to the console.
 */
void World::printWorld()
{
    for (int i = 0; i < worldMap.size(); i++)
    {
        for (int j = 0; j < worldMap[i].size(); j++)
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

/**
 * @brief Adds an actor to the world at the specified coordinates.
 * 
 * @param actor The actor to be added.
 * @param x The x-coordinate where the actor will be placed.
 * @param y The y-coordinate where the actor will be placed.
 */
void World::addObject(Actor& actor, int x, int y)
{
    worldMap[y][x].push_back(&actor);
}

/**
 * @brief Moves an actor to a new position within the world.
 * 
 * @param actor The actor to be moved.
 * @param x The new x-coordinate for the actor.
 * @param y The new y-coordinate for the actor.
 */
void World::moveObject(Actor& actor, int newX, int newY)
{
    bool isActorFound = false;

    for (int i = 0; i < worldMap.size(); i++)
    {
        for (int j = 0; j < worldMap[i].size(); j++)
        {
            auto& actors = worldMap[i][j];
            auto it = std::find(actors.begin(), actors.end(), &actor);
            if (it != actors.end())
            {
                actors.erase(it);
                isActorFound = true;
                break;
            }
        }
        if (isActorFound) break;
    }

    if (!isActorFound)
    {
        std::cerr << "Actor not found in the world map\n";
        return;
    }

    worldMap[newY][newX].push_back(&actor);
    SystemOutput::getInstance().outputMove(newX, newY);
}

// MARK: - Getter/Setter


/**
 * @brief Retrieves the player Rover at the specified coordinates.
 * 
 * @param x The x-coordinate of the location.
 * @param y The y-coordinate of the location.
 * 
 * @return Rover* Pointer to the player Rover at the specified coordinates, or nullptr if no player is found.
 */
Rover* World::getPlayer(int x, int y)
{
    if (x < 0 || x >= worldMap[0].size() || y < 0 || y >= worldMap.size())
    {
        return nullptr;
    }

    if (worldMap[y][x].empty())
    {
        return nullptr;
    }

    for (const auto& actor : worldMap[y][x])
    {
        if (actor->getType() == Actor::ActorType::PLAYER)
        {
            return dynamic_cast<Rover*>(actor);
        }
    }

    return nullptr;
}


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

    if (x < 0 || x >= worldMap[0].size() || y < 0 || y >= worldMap.size())
    {
        return obstacles;
    }

    if (worldMap[y][x].empty())
    {
        return obstacles;
    }

    for (const auto& actor : worldMap[y][x])
    {
        if (actor->getType() == Actor::ActorType::OBSTACLE)
        {
            obstacles.push_back(dynamic_cast<Obstacle*>(actor));
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
    if (x < 0 || x >= worldMap[0].size() || y < 0 || y >= worldMap.size())
    {
        return false;
    }

    if (worldMap[y][x].empty())
    {
        return false;
    }

    for (const auto& actor : worldMap[y][x])
    {
        if (actor->getType() == Actor::ActorType::DESTINATION)
        {
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
    return worldMap[0].size();
}

/**
 * @brief Retrieves the height of the world.
 * 
 * @return The height of the world.
 */
int World::getHeight()
{
    return worldMap.size();
}