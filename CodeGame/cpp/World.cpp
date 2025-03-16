#include "World.h"
#include "Actor.h"
#include "SystemOutput.h"
#include "Player.h"
#include "Obstacle.h"
#include "Destination.h"
#include "Item.h"

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
                    else if (actor->getType() == Actor::ActorType::ITEM)
                    {
                        std::cout << "I";
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
 * @param actorType The type of the actor to be added (PLAYER, DESTINATION, OBSTACLE, ITEM).
 * @param actorDirectionInWorld The direction the actor is facing.
 * @param x The x-coordinate (width) where the actor will be placed.
 * @param y The y-coordinate (height) where the actor will be placed.
 */
void World::addObject(Actor::ActorType actorType, Actor::ActorDirectionInWorld actorDirectionInWorld, int x, int y) 
{
    const int i = y; // y is the height coordinate, row in the world map
    const int j = x; // x is the width coordinate, column in the world map

    if (actorType == Actor::ActorType::PLAYER) {
        Player* player = new Player(x, y, actorDirectionInWorld, actorType, this);

        worldMap[i][j].push_back(player);
    } else if (actorType == Actor::ActorType::DESTINATION) {
        Destination* destination = new Destination(x, y, actorDirectionInWorld, actorType, this);

        worldMap[i][j].push_back(destination);
    } else if (actorType == Actor::ActorType::OBSTACLE) {
        Obstacle* obstacle = new Obstacle(x, y, actorDirectionInWorld, actorType, this);

         worldMap[i][j].push_back(obstacle);
    } else if (actorType == Actor::ActorType::ITEM) {
        Item* item = new Item(x, y, actorDirectionInWorld, actorType, this);

        worldMap[i][j].push_back(item);
        ++totalItems;
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
                    Player* player = static_cast<Player*>(actor);
                    player->act();
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
 * @brief Moves the specified player to a new position on the world map.
 * 
 * @param player The player object to be moved.
 * @param newX The new x-coordinate to move the player to.
 * @param newY The new y-coordinate to move the player to.
 * 
 * @note If the player is not found in the world map, an error message is printed to std::cerr.
 * @note If the new coordinates are out of bounds, an error message is printed to std::cerr.
 */
void World::moveObject(Player& player, int newX, int newY) {
    bool isActorFound = false;

    for (int i = 0; i < worldMap.size(); i++)
    {
        for (int j = 0; j < worldMap[i].size(); j++) 
        {
            auto& actors = worldMap[i][j];
            auto it = std::find_if(actors.begin(), actors.end(), [&player](const Actor* actor) {
                return actor == &player;
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
        worldMap[newY][newX].push_back(&player);
        SystemOutput::getInstance().outputMove(newX, newY);
    } else {
        std::cerr << "World.cpp - moveObject: Invalid position (" << newX << ", " << newY << ") for moving object" << std::endl;
    }
}

/**
 * @brief Determines the success of the player's mission.
 */
void World::determineSuccess() {
    bool reachedDestination = false;
    bool collectedAllItems = false;
    bool gameError = false;

    /* check if the player is at the destination */
    std::vector<int> playerPosition = findPlayer();

    if (playerPosition[0] == -1 && playerPosition[1] == -1) {
        std::cerr << "World.cpp - determineSuccess: Player not found in the world map" << std::endl;
        return;
    }

    // check if game error
    Player* player = nullptr;
    for (int i = 0; i < worldMap.size(); i++)
    {
        for (int j = 0; j < worldMap[i].size(); j++) 
        {
            auto& actors = worldMap[i][j];
            for (auto& actor : actors) {
                if (actor->getType() == Actor::ActorType::PLAYER) {
                    player = static_cast<Player*>(actor);
                    if (player->gameError) {
                        gameError = true;
                    }
                    break;
                }
            }
        }
    }

    if (!gameError) {
        reachedDestination = checkDestination(playerPosition[0], playerPosition[1]);
    }

    // check if the player got all Items
    if (totalItems > 0) {
        if (collectedItems == totalItems) {
            collectedAllItems = true;
        }
    }

    // output the result
    if (gameError) {
        SystemOutput::getInstance().outputInformation("Player left the play field. Game over.");
    } else {
        if (reachedDestination) {
            if (collectedAllItems) {
                SystemOutput::getInstance().outputInformation("Player reached the destination and collected all items.");
            } else {
                SystemOutput::getInstance().outputInformation("Player reached the destination but did not collect all items.");
            }
        } else {
            if (collectedAllItems) {
                SystemOutput::getInstance().outputInformation("Player did not reach the destination but collected all items.");
            } else {
                SystemOutput::getInstance().outputInformation("Player did not reach the destination and did not collect all items.");
            }
        }
    }
 
    SystemOutput::getInstance().outputSuccess(reachedDestination, totalItems , collectedItems);
}

/**
 * @brief Finds the position of the player in the world map.
 * 
 * @return std::vector<int> A vector containing the x and y coordinates of the player.
 */
std::vector<int> World::findPlayer() {
    std::vector<int> playerPosition = {-1, -1};

    for (int i = 0; i < worldMap.size(); i++)
    {
        for (int j = 0; j < worldMap[i].size(); j++) 
        {
            auto& actors = worldMap[i][j];
            for (auto& actor : actors) {
                if (actor->getType() == Actor::ActorType::PLAYER) {
                    playerPosition[0] = j;
                    playerPosition[1] = i;
                    return playerPosition;
                }
            }
        }
    }

    return playerPosition;
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
 * @brief Checks if there is a item at the specified coordinates in the world.
 * 
 * @param x The x-coordinate of the position to check.
 * @param y The y-coordinate of the position to check.
 * 
 * @return true if there is a item at the specified coordinates, false otherwise.
 */
bool World::checkItem(int x, int y)
{
    if (x < 0 || x >= width || y < 0 || y >= height) {
        std::cerr << "World.cpp - checkItem: Invalid position (" << x << ", " << y << ") for checking Item" << std::endl;
        return false;
    }

    for (auto& actor : worldMap[y][x]) {
        if (dynamic_cast<Item*>(actor)) {
            return true;
        }
    }
    return false;
}

/**
 * @brief Removes a item from the specified position in the world.
 *
 * @param x The x-coordinate of the position from which to remove the item.
 * @param y The y-coordinate of the position from which to remove the item.
 */
void World::removeItem(int x, int y)
{
    if (x < 0 || x >= width || y < 0 || y >= height) {
        std::cerr << "World.cpp - removeItem: Invalid position (" << x << ", " << y << ") for removing item" << std::endl;
        return;
    }

    std::vector<Actor*> actors = worldMap[y][x];

    for (int i = 0; i < actors.size(); i++) {
        if (actors[i]->getType() == Actor::ActorType::ITEM) {
            if (auto item = dynamic_cast<Item*>(actors[i])) {
                worldMap[y][x].erase(worldMap[y][x].begin() + i);
                delete item;
                SystemOutput::getInstance().outputRemoveItem(x, y);
                ++collectedItems;
                SystemOutput::getInstance().outputInformation("Item removed. Total Items collected " + std::to_string(collectedItems) + "/" + std::to_string(totalItems));
                return;
            }
        }
    }

    std::cerr << "World.cpp - removeItem: item not found at position (" << x << ", " << y << ")" << std::endl;
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