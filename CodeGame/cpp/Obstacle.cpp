#include "Obstacle.h"

Obstacle::Obstacle(int _x, int _y, ActorDirectionInWorld _actorDirectionInWorld, ActorType _actorType, World* _world)
    : Actor(_x, _y, _actorDirectionInWorld, _actorType, _world)
{}

void Obstacle::act()
{
    // Obstacle does not act
}