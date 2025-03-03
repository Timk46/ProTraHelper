#ifndef WORLD_H
#define WORLD_H

#include <vector>
#include <memory>

#include "Actor.h"
#include "Player.h"
#include "Obstacle.h"
#include "Destination.h"
#include "Item.h"

/*
** Forward declaration is used to declare a class without defining it.
*/
class Actor;
class Player;
class Obstacle;
class Destination;
class Item;

/**
 * @class World
 * @brief Represents a 2D world grid containing various actors.
 * 
 * The World class manages a grid of actors, allowing for adding, moving, and retrieving actors within the grid.
 */
class World {
    public:
        World(int _width, int _height);
        ~World();
        void printWorld();
        void addObject(Actor::ActorType actorType, Actor::ActorDirection actorDirection, int x, int y);
        void moveObject(Player& player, int x, int y);
        void run();
        void determineSuccess();
        std::vector<int> findPlayer();
        std::vector<Obstacle*> getObstacles(int x, int y);
        bool checkDestination(int x, int y);
        bool checkItem(int x, int y);
        void removeItem(int x, int y);
        int getWidth();
        int getHeight();
        void clear();

    private:
        std::vector<std::vector<std::vector<Actor*>>> worldMap;
        int width;
        int height;
        int totalItems = 0; // Total number of items in the world
        int collectedItems = 0; // Number of items collected by the player
};


#endif // WORLD_H