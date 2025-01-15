#include "Rover.h"
#include "World.h"
#include "SystemOutput.h"

#include <iostream>
#include <string>

Rover::Rover(int _x, int _y, ActorDirection _actorDirection, ActorType _actorType, World* _world)
    : Actor(_x, _y, _actorDirection, _actorType, _world)
{}

void Rover::act()
{
    drive();
    drive();
    analyseRock();
    drive();
    drive();
    drive();
    drive();
    turn(ActorDirection::SOUTH);
    drive();
    analyseRock();
    drive();
    analyseRock();
    drive();
    turn(ActorDirection::EAST);
    drive();
    drive();
    drive();
}

/**
 * @brief Drives the rover forward by one unit.
 */
void Rover::drive()
{    
    if (checkObstacle(actorDiraction)) {
        SystemOutput::getInstance().outputInformation("Obstacle detected in front.");
    } else if (checkWorldBounds(actorDiraction)) {
        SystemOutput::getInstance().outputInformation("World boundary detected in front.");
    } else {
        move(1);
    }

    if (checkDestination()) {
        std::cout << "Rover has reached the destination." << std::endl;
    }
}

/**
 * @brief Checks if there is an obstacle in the direction the rover is facing.
 *
 * @return true if there is an obstacle in the direction the rover is facing, false otherwise.
 */
bool Rover::checkObstacle()
{
    if (getDirection() == ActorDirection::NORTH) {
        if (world->getObstacles(getX(), getY() - 1).size() > 0) {
            return true;
        }
    } else if (getDirection() == ActorDirection::EAST) {
        if (world->getObstacles(getX() + 1, getY()).size() > 0) {
            return true;
        }
    } else if (getDirection() == ActorDirection::SOUTH) {
        if (world->getObstacles(getX(), getY() + 1).size() > 0) {
            return true;
        }
    } else if (getDirection() == ActorDirection::WEST) {
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
 *                  - ActorDirection::NORTH
 *                  - ActorDirection::EAST
 *                  - ActorDirection::SOUTH
 *                  - ActorDirection::WEST
 *
 * @return true if there is at least one obstacle in the specified direction,
 *         false otherwise.
 */
bool Rover::checkObstacle(ActorDirection direction)
{
    if (!world) {
        std::cerr << "Rover.cpp - checkObstacle: World instance is not reachable." << std::endl;
        return false;
    }

    if (direction == ActorDirection::NORTH) {
        if (world->getObstacles(getX(), getY() - 1).size() > 0) {
            return true;
        }
    } else if (direction == ActorDirection::EAST) {
        if (world->getObstacles(getX() + 1, getY()).size() > 0) {
            return true;
        }
    } else if (direction == ActorDirection::SOUTH) {
        if (world->getObstacles(getX(), getY() + 1).size() > 0) {
            return true;
        }
    } else if (direction == ActorDirection::WEST) {
        if (world->getObstacles(getX() - 1, getY()).size() > 0) {
            return true;
        }
    }
    return false;
}

/**
 * @brief Checks if the rover is about to move out of the world bounds in the given direction.
 * 
 * @param direction The direction in which the rover intends to move. It can be one of the following:
 *                  - ActorDirection::NORTH
 *                  - ActorDirection::EAST
 *                  - ActorDirection::SOUTH
 *                  - ActorDirection::WEST
 * 
 * @return true if the rover would move out of the world bounds, false otherwise.
 */
bool Rover::checkWorldBounds(ActorDirection direction)
{
    if (!world) {
        std::cerr << "Rover.cpp - checkWorldBounds: World instance is not reachable." << std::endl;
        return false;
    }

    if (direction == ActorDirection::NORTH) {
        if (getY() - 1 < 0) {
            return true;
        }
    } else if (direction == ActorDirection::EAST) {
        if (getX() + 1 >= world->getWidth()) {
            return true;
        }
    } else if (direction == ActorDirection::SOUTH) {
        if (getY() + 1 >= world->getHeight()) {
            return true;
        }
    } else if (direction == ActorDirection::WEST) {
        if (getX() - 1 < 0) {
            return true;
        }
    }
    return false;
}

/**
 * @brief Checks if the current position of the Rover is a valid destination.
 * 
 * @return true if the destination is valid, false otherwise.
 */
bool Rover::checkDestination()
{
    return world->checkDestination(getX(), getY());
}

/**
 * @brief Checks if there is a rock at the Rover's current position.
 * 
 * @return true if there is a rock at the Rover's current position, false otherwise.
 */
bool Rover::checkRock()
{
    return world->checkRock(getX(), getY());
}

/**
 * @brief Analyzes the current position for a rock.
 */
void Rover::analyseRock()
{
    if (checkRock()) {
        SystemOutput::getInstance().outputInformation("Rock detected at current position.");
        world->removeRock(getX(), getY());
    } else {
        SystemOutput::getInstance().outputInformation("No rock detected at current position.");
    }
}