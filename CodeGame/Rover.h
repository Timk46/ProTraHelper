#ifndef ROVER_H
#define ROVER_H

#include "Actor.h"
#include "World.h"

class Rover: public Actor {

    public:
        Rover(int x, int y, ActorDirection actorDirection, ActorType actorType, World* world);
        void act() override;

    private:
        void drive();
        bool checkObstacle();
        bool checkObstacle(ActorDirection direction);
        bool checkWorldBounds(ActorDirection direction);
        bool checkDestination();
        bool checkItem();
        void analyseItem();
};

#endif // ROVER_H