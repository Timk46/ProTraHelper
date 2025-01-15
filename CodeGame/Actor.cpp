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
 * @brief Moves the actor by a specified distance.
 * 
 * @param distance The distance to move the actor.
 */
void Actor::move(int distance)
{
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
    actorDiraction = diraction;

    SystemOutput::getInstance().outputTrun(getDirectionString());
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
        case Actor::ActorType::ROCK:
            return "ROCK";
    }
    return "";
}