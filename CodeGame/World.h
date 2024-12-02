#ifndef WORLD_H
#define WORLD_H

#include <vector>

#include "Actor.h"
#include "Obstacle.h"

/*
** Forward declaration is used to declare a class without defining it.
*/
class Actor;
class Rover;
class Obstical;

/**
 * @class World
 * @brief Represents a 2D world grid containing various actors.
 * 
 * The World class manages a grid of actors, allowing for adding, moving, and retrieving actors within the grid.
 */
class World {
    public:
        World(int worldWidth, int worldHeight);
        void printWorld();
        void addObject(Actor& actor, int x, int y);
        void moveObject(Actor& actor, int x, int y);
        Rover* getPlayer(int x, int y);
        std::vector<Obstacle*> getObstacles(int x, int y);
        bool checkDestination(int x, int y);
        int getWidth();
        int getHeight();

    private:
        std::vector<std::vector<std::vector<Actor*>>> worldMap;
};


#endif // WORLD_H