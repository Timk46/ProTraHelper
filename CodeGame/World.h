#ifndef WORLD_H
#define WORLD_H

#include <vector>
#include <memory>

#include "Actor.h"
#include "Rover.h"
#include "Obstacle.h"
#include "Destination.h"
#include "Rock.h"

/*
** Forward declaration is used to declare a class without defining it.
*/
class Actor;
class Rover;
class Obstacle;
class Destination;
class Rock;

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
        void moveObject(Rover& rover, int x, int y);
        void run();
        void determineSuccess();
        std::vector<int> findRover();
        std::vector<Obstacle*> getObstacles(int x, int y);
        bool checkDestination(int x, int y);
        bool checkRock(int x, int y);
        void removeRock(int x, int y);
        int getWidth();
        int getHeight();
        void clear();

    private:
        std::vector<std::vector<std::vector<Actor*>>> worldMap;
        int width;
        int height;
        int totalRocks = 0; // Total number of rocks in the world
        int collectedRocks = 0; // Number of rocks collected by the rover
};


#endif // WORLD_H