#ifndef DESTINATION_H
#define DESTINATION_H

#include "Actor.h"

class Destination: public Actor {

    public:
        Destination(int x, int y, ActorDirection actorDirection, ActorType actorType, World& world);
        void act();
};

#endif // DESTINATION_H