#ifndef PLAYER_H
#define PLAYER_H

#include "Actor.h"
#include "World.h"

class Player: public Actor {

    public:
        Player(int x, int y, ActorDirectionInWorld actorDirectionInWorld, ActorType actorType, World* world);
        void act() override;

    private:
        void drive();
        bool checkObstacle();
        bool checkObstacle(ActorDirectionInWorld direction);
        bool checkWorldBounds(ActorDirectionInWorld direction);
        bool checkDestination();
        bool checkItem();
        void analyseItem();
};

#endif // PLAYER_H