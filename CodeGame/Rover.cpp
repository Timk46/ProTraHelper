#include "Rover.h"
#include "World.h"

#include <iostream>

Rover::Rover(int _x, int _y, ActorDirection _actorDirection, ActorType _actorType, World& _world)
    : Actor(_x, _y, _actorDirection, _actorType, _world)
{}

void Rover::act() {
    drive();
}

void Rover::drive() {
    move(1);
    turn(ActorDirection::SOUTH);
    move(1);
}

bool Rover::checkObstacle() {
    if (getDirection() == ActorDirection::NORTH) {
        if (world.getObstacles(getX(), getY() - 1).size() > 0) {
            return true;
        }
    } else if (getDirection() == ActorDirection::EAST) {
        if (world.getObstacles(getX() + 1, getY()).size() > 0) {
            return true;
        }
    } else if (getDirection() == ActorDirection::SOUTH) {
        if (world.getObstacles(getX(), getY() + 1).size() > 0) {
            return true;
        }
    } else if (getDirection() == ActorDirection::WEST) {
        if (world.getObstacles(getX() - 1, getY()).size() > 0) {
            return true;
        }
    }
    return false;
}