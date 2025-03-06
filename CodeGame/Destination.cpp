#include "Destination.h"

Destination::Destination(int _x, int _y, ActorDirection _actorDirection, ActorType _actorType, World* _world)
    : Actor(_x, _y, _actorDirection, _actorType, _world)
{}

void Destination::act()
{
    // Destination does not act
}