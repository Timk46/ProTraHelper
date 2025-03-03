#ifndef PLAYER_H
#define PLAYER_H

#include "Actor.h"
#include "World.h"

class Player: public Actor {

    public:
        Player(int x, int y, ActorDirection actorDirection, ActorType actorType, World* world);
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

#endif // PLAYER_H