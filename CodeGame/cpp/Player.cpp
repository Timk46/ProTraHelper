#include "Player.h"
#include "World.h"
#include "SystemOutput.h"

#include <iostream>
#include <string>

Player::Player(int _x, int _y, ActorDirectionInWorld _actorDirectionInWorld, ActorType _actorType, World* _world)
    : Actor(_x, _y, _actorDirectionInWorld, _actorType, _world)
{}

void Player::act()
{
    drive();
    drive();
    analyseItem();
    drive();
    drive();
    drive();
    drive();
    turn(ActorDirection::RIGHT);
    drive();
    analyseItem();
    drive();
    analyseItem();
    drive();
    turn(ActorDirection::LEFT);
    drive();
    drive();
    drive();
}

/**
 * @brief Drives the player forward by one unit.
 */
void Player::drive()
{    
    move(1);

    if (checkDestination()) {
        std::cout << "Player has reached the destination." << std::endl;
    }
}

/**
 * @brief Checks if there is an obstacle in the direction the player is facing.
 *
 * @return true if there is an obstacle in the direction the player is facing, false otherwise.
 */
bool Player::checkObstacle()
{
    if (getDirection() == ActorDirectionInWorld::NORTH) {
        if (world->getObstacles(getX(), getY() - 1).size() > 0) {
            return true;
        }
    } else if (getDirection() == ActorDirectionInWorld::EAST) {
        if (world->getObstacles(getX() + 1, getY()).size() > 0) {
            return true;
        }
    } else if (getDirection() == ActorDirectionInWorld::SOUTH) {
        if (world->getObstacles(getX(), getY() + 1).size() > 0) {
            return true;
        }
    } else if (getDirection() == ActorDirectionInWorld::WEST) {
        if (world->getObstacles(getX() - 1, getY()).size() > 0) {
            return true;
        }
    }
    return false;
}

/**
 * @brief Checks for obstacles in the specified direction.
 *
 * @param direction The direction in which to check for obstacles.
 *                  It can be one of the following values:
 *                  - ActorDirectionInWorld::NORTH
 *                  - ActorDirectionInWorld::EAST
 *                  - ActorDirectionInWorld::SOUTH
 *                  - ActorDirectionInWorld::WEST
 *
 * @return true if there is at least one obstacle in the specified direction,
 *         false otherwise.
 */
bool Player::checkObstacle(ActorDirectionInWorld direction)
{
    if (!world) {
        std::cerr << "Player.cpp - checkObstacle: World instance is not reachable." << std::endl;
        return false;
    }

    if (direction == ActorDirectionInWorld::NORTH) {
        if (world->getObstacles(getX(), getY() - 1).size() > 0) {
            return true;
        }
    } else if (direction == ActorDirectionInWorld::EAST) {
        if (world->getObstacles(getX() + 1, getY()).size() > 0) {
            return true;
        }
    } else if (direction == ActorDirectionInWorld::SOUTH) {
        if (world->getObstacles(getX(), getY() + 1).size() > 0) {
            return true;
        }
    } else if (direction == ActorDirectionInWorld::WEST) {
        if (world->getObstacles(getX() - 1, getY()).size() > 0) {
            return true;
        }
    }
    return false;
}

/**
 * @brief Checks if the player is about to move out of the world bounds in the given direction.
 * 
 * @param direction The direction in which the player intends to move. It can be one of the following:
 *                  - ActorDirectionInWorld::NORTH
 *                  - ActorDirectionInWorld::EAST
 *                  - ActorDirectionInWorld::SOUTH
 *                  - ActorDirectionInWorld::WEST
 * 
 * @return true if the player would move out of the world bounds, false otherwise.
 */
bool Player::checkWorldBounds(ActorDirectionInWorld direction)
{
    if (!world) {
        std::cerr << "Player.cpp - checkWorldBounds: World instance is not reachable." << std::endl;
        return false;
    }

    if (direction == ActorDirectionInWorld::NORTH) {
        if (getY() - 1 < 0) {
            return true;
        }
    } else if (direction == ActorDirectionInWorld::EAST) {
        if (getX() + 1 >= world->getWidth()) {
            return true;
        }
    } else if (direction == ActorDirectionInWorld::SOUTH) {
        if (getY() + 1 >= world->getHeight()) {
            return true;
        }
    } else if (direction == ActorDirectionInWorld::WEST) {
        if (getX() - 1 < 0) {
            return true;
        }
    }
    return false;
}

/**
 * @brief Checks if the current position of the Player is a valid destination.
 * 
 * @return true if the destination is valid, false otherwise.
 */
bool Player::checkDestination()
{
    if (gameError) {
        return false;
    }

    return world->checkDestination(getX(), getY());
}

/**
 * @brief Checks if there is a item at the Player's current position.
 * 
 * @return true if there is a item at the Player's current position, false otherwise.
 */
bool Player::checkItem()
{
    return world->checkItem(getX(), getY());
}

/**
 * @brief Analyzes the current position for a Item.
 */
void Player::analyseItem()
{
    if (gameError) {
        return;
    }

    if (checkItem()) {
        SystemOutput::getInstance().outputInformation("Item detected at current position.");
        world->removeItem(getX(), getY());
    } else {
        SystemOutput::getInstance().outputInformation("No item detected at current position.");
    }
}