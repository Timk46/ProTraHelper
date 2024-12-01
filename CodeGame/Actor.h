#ifndef ACTOR_H
#define ACTOR_H

#include <string>

class World; // Forward declaration

/**
 * @class Actor
 * @brief Represents an actor in the game world.
 * 
 * The Actor class defines the properties and behaviors of an actor in the game world.
 * An actor can be a player or an obstacle and can move and turn within the world.
 */
class Actor {
    public:
        
        /**
         * @enum Actor::ActorType
         * @brief Defines the type of the actor.
         * 
         * The ActorType enum specifies whether the actor is a player or an obstacle.
         * - PLAYER: Represents a player actor.
         * - OBSTACLE: Represents an obstacle actor.
         */
        enum class ActorType {
            PLAYER,
            OBSTACLE,
            DESTINATION
        };

        /**
         * @enum Actor::ActorDirection
         * @brief Defines the direction the actor is facing.
         * 
         * The ActorDirection enum specifies the direction the actor is facing.
         * - NORTH: Facing north.
         * - EAST: Facing east.
         * - SOUTH: Facing south.
         * - WEST: Facing west.
         */
        enum class ActorDirection {
            NORTH,
            EAST,
            SOUTH,
            WEST,
        };

        Actor(int x, int y, ActorDirection actorDirection, ActorType actorType, World& world);
        virtual ~Actor() = default; // virtual destructor, for dynamic polymorphism (casting)

        void act();
        void move(int distance);
        void turn(ActorDirection diraction);
        int getX();
        int getY();
        ActorType getType();
        ActorDirection getDirection();

        // make Rover a friend class to access private members
        friend class Rover; 

    private:
        int x;
        int y;
        ActorType actorType;
        ActorDirection actorDiraction;
        World& world;

        std::string getDirectionString();
        std::string getActorTypeString();
};

#endif // ACTOR_H