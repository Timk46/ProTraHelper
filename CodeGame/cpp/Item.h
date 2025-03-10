#ifndef ITEM_H
#define ITEM_H

#include "Actor.h"
#include "World.h"

class Item : public Actor {

    public:
        Item(int x, int y, ActorDirection actorDirection, ActorType actorType, World* world);
        void act() override;
};

#endif // ITEM_H