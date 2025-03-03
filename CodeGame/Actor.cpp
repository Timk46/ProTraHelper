#include "Actor.h"
#include "World.h"
#include "SystemOutput.h"

#include <iostream>

/**
 * @brief Constructs an Actor object.
 * 
 * @param x The initial x-coordinate of the actor.
 * @param y The initial y-coordinate of the actor.
 * @param actorDirection The initial direction the actor is facing.
 * @param actorType The type of the actor (player or obstacle).
 * @param world A reference to the world the actor belongs to.
 */
Actor::Actor(int _x, int _y, ActorDirection _direction, ActorType _actorType, World* _world)
    : x(_x), y(_y), actorDiraction(_direction), actorType(_actorType), world(_world)
{
    // std::cout << "Actor is created. " << "Type: " << getActorTypeString() << "\n"; // for debugging
}

// MARK: - movements

/**
 * @brief Moves the actor by a specified distance in the current direction.
 * 
 * @param distance The distance to move the actor.
 */
void Actor::move(int distance)
{
    if (gameError) {
        return;
    }

    if (checkObstacle()) {
        SystemOutput::getInstance().outputInformation("Obstacle detected in front.");
        return;
    }

    if (checkWorldBounds()) {
        SystemOutput::getInstance().outputInformation("World boundary detected.");
        SystemOutput::getInstance().outputWarning();
        gameError = true;
        return;
    }

    int newX = x;
    int newY = y;

    switch (actorDiraction) {
        case ActorDirection::NORTH:
            newY -= distance;
            break;
        case ActorDirection::EAST:
            newX += distance;
            break;
        case ActorDirection::SOUTH:
            newY += distance;
            break;
        case ActorDirection::WEST:
            newX -= distance;
            break;
    }

    if (world) {
        world->moveObject(static_cast<Rover&>(*this), newX, newY);
        x = newX;
        y = newY;
    } else {
         std::cerr << "Actor.cpp - move: World instance is not reachable." << std::endl;
    } 
}

/**
 * @brief Turns the actor to face a specified direction.
 * 
 * @param diraction The direction to turn the actor.
 */
void Actor::turn(ActorDirection diraction)
{
    if (gameError) {
        return;
    }

    actorDiraction = diraction;

    SystemOutput::getInstance().outputTrun(getDirectionString());
}


/**
 * @brief Checks if there is an obstacle in the direction the actor is facing.
 *
 * @return true if there is an obstacle in the direction the actor is facing, false otherwise.
 */
bool Actor::checkObstacle()
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
 * @brief Checks if the actor is about to move out of the world bounds in the direction the actor is facing.
 * 
 * @return true if the actor would move out of the world bounds, false otherwise.
 */
bool Actor::checkWorldBounds()
{
    if (!world) {
        std::cerr << "Actor.cpp - checkWorldBounds: World instance is not reachable." << std::endl;
        return false;
    }

    if (actorDiraction == ActorDirection::NORTH) {
        if (getY() - 1 < 0) {
            return true;
        }
    } else if (actorDiraction == ActorDirection::EAST) {
        if (getX() + 1 >= world->getWidth()) {
            return true;
        }
    } else if (actorDiraction == ActorDirection::SOUTH) {
        if (getY() + 1 >= world->getHeight()) {
            return true;
        }
    } else if (actorDiraction == ActorDirection::WEST) {
        if (getX() - 1 < 0) {
            return true;
        }
    }
    return false;
}

// MARK: - getter/setter

/**
 * @brief Gets the x-coordinate of the actor.
 * 
 * @return The x-coordinate of the actor.
 */
int Actor::getX()
{
    return x;
}

/**
 * @brief Gets the y-coordinate of the actor.
 * 
 * @return The y-coordinate of the actor.
 */
int Actor::getY()
{
    return y;
}

/**
 * @brief Gets the direction the actor is facing.
 * 
 * @return The direction the actor is facing.
 */
Actor::ActorDirection Actor::getDirection()
{
    return actorDiraction;
}

/**
 * @brief Converts the actor's direction to a string representation.
 * 
 * @return A string representing the direction the actor is facing.
 */
std::string Actor::getDirectionString() 
{
    switch (actorDiraction) {
        case Actor::ActorDirection::NORTH:
            return "NORTH";
        case Actor::ActorDirection::EAST:
            return "EAST";
        case Actor::ActorDirection::SOUTH:
            return "SOUTH";
        case Actor::ActorDirection::WEST:
            return "WEST";
    }
    return "";
}

/**
 * @brief Gets the type of the actor.
 * 
 * @return The type of the actor (player or obstacle).
 */
Actor::ActorType Actor::getType() const
{
    return actorType;
}

/**
 * @brief Converts the actor's type to a string representation.
 * 
 * @return A string representing the type of the actor.
 */
std::string Actor::getActorTypeString()
{
    switch (actorType) {
        case Actor::ActorType::PLAYER:
            return "PLAYER";
        case Actor::ActorType::OBSTACLE:
            return "OBSTACLE";
        case Actor::ActorType::DESTINATION:
            return "DESTINATION";
        case Actor::ActorType::ITEM:
            return "ITEM";
    }
    return "";
}

/**
 * @brief Retrieves the current game error status.
 * 
 * @return true if there is a game error, false otherwise.
 */
bool Actor::getGameError()
{
    return gameError;
}