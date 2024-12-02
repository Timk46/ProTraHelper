#ifndef ROVER_H
#define ROVER_H

#include "Actor.h"

class Rover: public Actor {

    public:
        Rover(int x, int y, ActorDirection actorDirection, ActorType actorType, World& world);
        void act();

    private:
        void drive();
        bool checkObstacle();
        bool checkObstacle(ActorDirection direction);
        bool checkWorldBounds(ActorDirection direction);
        bool checkDestination();
};

#endif // ROVER_H