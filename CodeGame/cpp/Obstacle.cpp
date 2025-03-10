#include "Obstacle.h"

Obstacle::Obstacle(int _x, int _y, ActorDirection _actorDirection, ActorType _actorType, World* _world)
    : Actor(_x, _y, _actorDirection, _actorType, _world)
{}

void Obstacle::act()
{
    // Obstacle does not act
}