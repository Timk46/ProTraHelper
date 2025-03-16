#ifndef OBSTACLE_H
#define OBSTACLE_H

#include "Actor.h"
#include "World.h"

class Obstacle: public Actor {

    public:
        Obstacle(int x, int y, ActorDirectionInWorld actorDirectionInWorld, ActorType actorType, World* world);
        void act() override;
};

#endif // OBSTACLE_H
