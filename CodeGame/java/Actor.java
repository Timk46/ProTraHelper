package game;


public abstract class Actor {
    /**
     * The ActorType enum represents the different types of actors that can exist in the game.
     * Each actor type has a specific role or function within the game.
     * 
     * The ActorType enum specifies whether the actor is a player, obstacle, destination, or item.
     * - PLAYER: Represents a player actor.
     * - OBSTACLE: Represents an obstacle actor.
     * - DESTINATION: Represents a destination actor.
     * - ITEM: Represents a item actor.
     */
    public enum ActorType {
        PLAYER,
        OBSTACLE,
        DESTINATION,
        ITEM
    }

    /**
     * The ActorDirection enum represents the four cardinal directions.
     * It is used to specify the direction in which an actor is facing or moving.
     * 
     * The ActorDirection enum specifies the direction the actor is facing.
     * - NORTH: Facing north.
     * - EAST: Facing east.
     * - SOUTH: Facing south.
     * - WEST: Facing west.
     */
    public enum ActorDirection {
        NORTH,
        EAST,
        SOUTH,
        WEST
    }

    protected int x;
    protected int y;
    protected ActorType actorType;
    protected ActorDirection actorDirection;
    protected World world;
    protected boolean gameError = false;

    /**
     * Constructs an Actor with the specified position, direction, type, and world.
     *
     * @param x the x-coordinate of the actor
     * @param y the y-coordinate of the actor
     * @param actorDirection the direction the actor is facing
     * @param actorType the type of the actor
     * @param world the world in which the actor exists
     */
    public Actor(int x, int y, ActorDirection actorDirection, ActorType actorType, World world) {
        this.x = x;
        this.y = y;
        this.actorDirection = actorDirection;
        this.actorType = actorType;
        this.world = world;
    }

    /**
     * Defines the action that this actor will perform.
     * This method should be implemented by subclasses to specify the behavior of the actor.
     */
    public abstract void act();

    /**
     * Moves the actor a specified distance in the current direction.
     * 
     * @param distance the distance to move the actor
     */
    public void move(int distance) {
        if (gameError) {
            return;
        }

        if (checkWorldBounds()) {
            SystemOutput.getInstance().outputInformation("World boundary detected.");
            SystemOutput.getInstance().outputWarning();
            gameError = true;
            return;
        }

        if (checkObstacle()) {
            SystemOutput.getInstance().outputInformation("Obstacle detected in front.");
            return;
        }

        int newX = x;
        int newY = y;

        switch (actorDirection) {
            case NORTH:
                newY -= distance;
                break;
            case EAST:
                newX += distance;
                break;
            case SOUTH:
                newY += distance;
                break;
            case WEST:
                newX -= distance;
                break;
        }

        if (world != null) {
            world.moveObject((Player) this, newX, newY);
            x = newX;
            y = newY;
        } else {
            System.err.println("Actor.java - move: World instance is not reachable.");
        }
    }

    /**
     * Turns the actor to the specified direction.
     *
     * @param direction The direction to turn the actor to.
     */
    public void turn(ActorDirection direction) {
        if (gameError) {
            return;
        }

        actorDirection = direction;
        SystemOutput.getInstance().outputTurn(getDirectionString());
    }

    /**
     * Checks if there is an obstacle in the direction the actor is facing.
     *
     * @return true if there is an obstacle in the direction the actor is facing, false otherwise.
     */
    public boolean checkObstacle() {
        switch (actorDirection) {
            case NORTH:
                return world.getObstacles(x, y - 1).size() > 0;
            case EAST:
                return world.getObstacles(x + 1, y).size() > 0;
            case SOUTH:
                return world.getObstacles(x, y + 1).size() > 0;
            case WEST:
                return world.getObstacles(x - 1, y).size() > 0;
            default:
                return false;
        }
    }

    /**
     * Checks if the actor is within the bounds of the world.
     * 
     * @return true if the actor is within the bounds of the world, false otherwise.
     */
    public boolean checkWorldBounds() {
        if (world == null) {
            System.err.println("Actor.java - checkWorldBounds: World instance is not reachable.");
            return false;
        }

        switch (actorDirection) {
            case NORTH:
                return y - 1 < 0;
            case EAST:
                return x + 1 >= world.getWidth();
            case SOUTH:
                return y + 1 >= world.getHeight();
            case WEST:
                return x - 1 < 0;
            default:
                return false;
        }
    }

    /**
     * Returns the x-coordinate of the actor.
     *
     * @return the x-coordinate
     */
    public int getX() {
        return x;
    }

    /**
     * Returns the y-coordinate of the actor.
     *
     * @return the y-coordinate
     */
    public int getY() {
        return y;
    }

    /**
     * Retrieves the current direction of the actor.
     *
     * @return the direction of the actor as an {@link ActorDirection} enum.
     */
    public ActorDirection getDirection() {
        return actorDirection;
    }

    /**
     * Returns the string representation of the actor's direction.
     *
     * @return A string representing the direction of the actor. Possible values are:
     *         "NORTH", "EAST", "SOUTH", "WEST". If the direction is not recognized,
     *         an empty string is returned.
     */
    public String getDirectionString() {
        switch (actorDirection) {
            case NORTH:
                return "NORTH";
            case EAST:
                return "EAST";
            case SOUTH:
                return "SOUTH";
            case WEST:
                return "WEST";
            default:
                return "";
        }
    }

    /**
     * Retrieves the type of the actor.
     *
     * @return the type of the actor as an {@link ActorType}.
     */
    public ActorType getType() {
        return actorType;
    }

    /**
     * Returns the string representation of the actor type.
     *
     * @return a string representing the actor type, which can be "PLAYER", "OBSTACLE",
     *         "DESTINATION", "ITEM", or an empty string if the actor type is not recognized.
     */
    public String getActorTypeString() {
        switch (actorType) {
            case PLAYER:
                return "PLAYER";
            case OBSTACLE:
                return "OBSTACLE";
            case DESTINATION:
                return "DESTINATION";
            case ITEM:
                return "ITEM";
            default:
                return "";
        }
    }

    /**
     * Returns the current game error status.
     *
     * @return true if there is a game error, false otherwise.
     */
    public boolean getGameError() {
        return gameError;
    }
}
