#include "Rock.h"

Rock::Rock(int _x, int _y, ActorDirection _actorDirection, ActorType _actorType, World* _world)
    : Actor(_x, _y, _actorDirection, _actorType, _world)
{}

void Rock::act()
{
    // Rock does not act
}