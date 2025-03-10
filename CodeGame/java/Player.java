package game;

public class Player extends Actor {
    /**
     * Constructs a new Player object with the specified position, direction, type, and world.
     *
     * @param x the x-coordinate of the player's position
     * @param y the y-coordinate of the player's position
     * @param actorDirection the direction the player is facing
     * @param actorType the type of actor the player is
     * @param world the world in which the player exists
     */
    public Player(int x, int y, ActorDirection actorDirection, ActorType actorType, World world) {
        super(x, y, actorDirection, actorType, world);
    }

    /**
     * This method is called to perform the action associated with the player.
     * It is an overridden method that should contain the logic for the player's action.
     */
    @Override
    public void act() {
        drive();
        drive();
        analyseItem();
        drive();
        drive();
        drive();
        drive();
        turn(ActorDirection.SOUTH);
        drive();
        analyseItem();
        drive();
        analyseItem();
        drive();
        turn(ActorDirection.EAST);
        drive();
        drive();
        drive();

    }

    /**
     * Drives the player by moving them one step forward.
     * If the player reaches the destination, a message is printed to the console.
     */
    public void drive() {
        move(1);

        if (checkDestination()) {
            System.out.println("Player has reached the destination.");
        }
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
     * Checks if there is an obstacle in the specified direction relative to the player's current position.
     *
     * @param direction The direction in which to check for obstacles (NORTH, EAST, SOUTH, or WEST).
     * @return true if there is at least one obstacle in the specified direction, false otherwise.
     * @throws NullPointerException if the world instance is not reachable.
     */
    public boolean checkObstacle(ActorDirection direction) {
        if (world == null) {
            System.err.println("Player.java - checkObstacle: World instance is not reachable.");
            return false;
        }

        switch (direction) {
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
     * Checks if the player is within the bounds of the world in the specified direction.
     *
     * @param direction The direction in which to check the bounds.
     * @return {@code true} if moving in the specified direction would go out of bounds, {@code false} otherwise.
     * @throws IllegalStateException if the world instance is not reachable.
     */
    public boolean checkWorldBounds(ActorDirection direction) {
        if (world == null) {
            System.err.println("Player.java - checkWorldBounds: World instance is not reachable.");
            return false;
        }

        switch (direction) {
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
     * Checks if the current destination is valid.
     * 
     * @return true if the destination is valid and there is no game error, false otherwise.
     */
    public boolean checkDestination() {
        if (gameError) {
            return false;
        }

        return world.checkDestination(x, y);
    }

    /**
     * Checks if there is an item at the player's current position.
     *
     * @return true if there is an item at the player's current position, false otherwise.
     */
    public boolean checkItem() {
        return world.checkItem(x, y);
    }

    /**
     * Analyzes the item at the player's current position.
     * If there is an error in the game, the method returns immediately.
     * If an item is detected at the current position, it outputs a message indicating the detection
     * and removes the item from the world. If no item is detected, it outputs a message indicating
     * the absence of an item.
     */
    public void analyseItem() {
        if (gameError) {
            return;
        }

        if (checkItem()) {
            SystemOutput.getInstance().outputInformation("Item detected at current position.");
            world.removeItem(x, y);
        } else {
            SystemOutput.getInstance().outputInformation("No item detected at current position.");
        }
    }
}
