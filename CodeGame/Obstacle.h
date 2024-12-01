#ifndef OBSTACLE_H
#define OBSTACLE_H

#include "Actor.h"

class Obstacle: public Actor {

    public:
        Obstacle(int x, int y, ActorDirection actorDirection, ActorType actorType, World& world);
};

#endif // OBSTACLE_H
