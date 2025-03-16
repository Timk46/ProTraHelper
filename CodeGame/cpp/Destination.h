#ifndef DESTINATION_H
#define DESTINATION_H

#include "Actor.h"
#include "World.h"

class Destination: public Actor {

    public:
        Destination(int x, int y, ActorDirectionInWorld actorDirectionInWorld, ActorType actorType, World* world);
        void act() override;
};

#endif // DESTINATION_H