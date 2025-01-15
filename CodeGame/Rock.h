#ifndef ROCK_H
#define ROCK_H

#include "Actor.h"
#include "World.h"

class Rock : public Actor {

    public:
        Rock(int x, int y, ActorDirection actorDirection, ActorType actorType, World* world);
        void act() override;
};

#endif // ROCK_H