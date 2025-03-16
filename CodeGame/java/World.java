package game;

import java.util.ArrayList;
import java.util.List;

public class World {
    private final int width;
    private final int height;
    private final List<List<List<Actor>>> worldMap;
    private int totalItems = 0;
    private int collectedItems = 0;

    /**
     * Constructs a new World with the specified width and height.
     * Initializes the world map as a 2D list of actors.
     *
     * @param width  the width of the world
     * @param height the height of the world
     */
    public World(int width, int height) {
        this.width = width;
        this.height = height;
        this.worldMap = new ArrayList<>(height);
        for (int i = 0; i < height; i++) {
            List<List<Actor>> row = new ArrayList<>(width);
            for (int j = 0; j < width; j++) {
                row.add(new ArrayList<>());
            }
            worldMap.add(row);
        }
    }

    /**
     * Prints the current state of the world to the console.
     * The world is represented as a grid where each cell can contain multiple actors.
     * The following symbols are used to represent different types of actors:
     * - '.' for an empty cell
     * - 'P' for a player
     * - 'O' for an obstacle
     * - 'D' for a destination
     * - 'I' for an item
     * 
     * The method iterates through each cell in the world map and prints the appropriate symbol
     * based on the type of actor present in the cell.
     */
    public void printWorld() {
        for (int i = 0; i < height; i++) {
            for (int j = 0; j < width; j++) {
                if (worldMap.get(i).get(j).isEmpty()) {
                    System.out.print(".");
                } else {
                    for (Actor actor : worldMap.get(i).get(j)) {
                        switch (actor.getType()) {
                            case PLAYER:
                                System.out.print("P");
                                break;
                            case OBSTACLE:
                                System.out.print("O");
                                break;
                            case DESTINATION:
                                System.out.print("D");
                                break;
                            case ITEM:
                                System.out.print("I");
                                break;
                        }
                    }
                }
            }
            System.out.println();
        }
    }

    /**
     * Adds an object of the specified type to the world at the given coordinates.
     *
     * @param actorType The type of the actor to be added (e.g., PLAYER, DESTINATION, OBSTACLE, ITEM).
     * @param actorDirectionInWorld The direction the actor is facing.
     * @param x The x-coordinate where the actor should be placed.
     * @param y The y-coordinate where the actor should be placed.
     */
    public void addObject(Actor.ActorType actorType, Actor.ActorDirectionInWorld actorDirectionInWorld, int x, int y) {
        switch (actorType) {
            case PLAYER:
                Player player = new Player(x, y, actorDirectionInWorld, actorType, this);
                worldMap.get(y).get(x).add(player);
                break;
            case DESTINATION:
                Destination destination = new Destination(x, y, actorDirectionInWorld, actorType, this);
                worldMap.get(y).get(x).add(destination);
                break;
            case OBSTACLE:
                Obstacle obstacle = new Obstacle(x, y, actorDirectionInWorld, actorType, this);
                worldMap.get(y).get(x).add(obstacle);
                break;
            case ITEM:
                Item item = new Item(x, y, actorDirectionInWorld, actorType, this);
                worldMap.get(y).get(x).add(item);
                totalItems++;
                break;
            default:
                System.err.println("World.java - addObject: could not add the object");
                break;
        }
    }

    /**
     * Executes the `act` method of the first `Player` actor found in the `worldMap`.
     * The `worldMap` is a nested list structure containing rows of cells, 
     * where each cell contains a list of `Actor` objects.
     */
    public void run() {
        for (List<List<Actor>> row : worldMap) {
            for (List<Actor> cell : row) {
                for (Actor actor : cell) {
                    if (actor.getType() == Actor.ActorType.PLAYER) {
                        ((Player) actor).act();
                        return;
                    }
                }
            }
        }
        System.err.println("World.java - run: Actor not found in the world map");
    }

    /**
     * Moves the specified player to a new position in the world map.
     *
     * @param player the player to be moved
     * @param newX the new x-coordinate for the player
     * @param newY the new y-coordinate for the player
     */
    public void moveObject(Player player, int newX, int newY) {
        boolean isActorFound = false;

        for (List<List<Actor>> row : worldMap) {
            for (List<Actor> cell : row) {
                if (cell.remove(player)) {
                    isActorFound = true;
                    break;
                }
            }
            if (isActorFound) break;
        }

        if (!isActorFound) {
            System.err.println("World.java - moveObject: Actor not found in the world map");
            return;
        }

        if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
            worldMap.get(newY).get(newX).add(player);
            SystemOutput.getInstance().outputMove(newX, newY);
        } else {
            System.err.println("World.java - moveObject: Invalid position (" + newX + ", " + newY + ") for moving object");
        }
    }

    /**
     * Determines the success of the game based on the player's position, collected items, and game errors.
     */
    public void determineSuccess() {
        boolean reachedDestination = false;
        boolean collectedAllItems = false;
        boolean gameError = false;

        int[] playerPosition = findPlayer();
        if (playerPosition[0] == -1 && playerPosition[1] == -1) {
            System.err.println("World.java - determineSuccess: Player not found in the world map");
            return;
        }

        Player player = null;
        for (List<List<Actor>> row : worldMap) {
            for (List<Actor> cell : row) {
                for (Actor actor : cell) {
                    if (actor.getType() == Actor.ActorType.PLAYER) {
                        player = (Player) actor;
                        if (player.getGameError()) {
                            gameError = true;
                        }
                        break;
                    }
                }
            }
        }

        if (!gameError) {
            reachedDestination = checkDestination(playerPosition[0], playerPosition[1]);
        }

        if (totalItems > 0 && collectedItems == totalItems) {
            collectedAllItems = true;
        }

        if (gameError) {
            SystemOutput.getInstance().outputInformation("Player left the play field. Game over.");
        } else {
            if (reachedDestination) {
                if (collectedAllItems) {
                    SystemOutput.getInstance().outputInformation("Player reached the destination and collected all items.");
                } else {
                    SystemOutput.getInstance().outputInformation("Player reached the destination but did not collect all items.");
                }
            } else {
                if (collectedAllItems) {
                    SystemOutput.getInstance().outputInformation("Player did not reach the destination but collected all items.");
                } else {
                    SystemOutput.getInstance().outputInformation("Player did not reach the destination and did not collect all items.");
                }
            }
        }

        if (reachedDestination) {
            SystemOutput.getInstance().outputSuccess(1, totalItems, collectedItems);
        } else {
            SystemOutput.getInstance().outputSuccess(0, totalItems, collectedItems);
        }
    }

    /**
     * Finds the position of the player in the world map.
     * 
     * @return an array of two integers representing the player's position
     *         in the format [x, y]. If the player is not found, returns [-1, -1].
     */
    public int[] findPlayer() {
        int[] playerPosition = {-1, -1};

        for (int i = 0; i < worldMap.size(); i++) {
            for (int j = 0; j < worldMap.get(i).size(); j++) {
                for (Actor actor : worldMap.get(i).get(j)) {
                    if (actor.getType() == Actor.ActorType.PLAYER) {
                        playerPosition[0] = j;
                        playerPosition[1] = i;
                        return playerPosition;
                    }
                }
            }
        }

        return playerPosition;
    }

    /**
     * Retrieves a list of obstacles at the specified coordinates (x, y) in the world.
     *
     * @param x the x-coordinate of the position to check for obstacles
     * @param y the y-coordinate of the position to check for obstacles
     * @return a list of obstacles at the specified coordinates; an empty list if the coordinates are invalid or no obstacles are present
     */
    public List<Obstacle> getObstacles(int x, int y) {
        List<Obstacle> obstacles = new ArrayList<>();

        if (x < 0 || x >= width || y < 0 || y >= height) {
            System.err.println("World.java - getObstacles: Invalid position (" + x + ", " + y + ") for retrieving obstacles");
            return obstacles;
        }

        for (Actor actor : worldMap.get(y).get(x)) {
            if (actor.getType() == Actor.ActorType.OBSTACLE) {
                obstacles.add((Obstacle) actor);
            }
        }

        return obstacles;
    }

    /**
     * Checks if the specified coordinates (x, y) contain a Destination.
     *
     * @param x the x-coordinate to check
     * @param y the y-coordinate to check
     * @return true if the coordinates contain a Destination, false otherwise
     * @throws IllegalArgumentException if the coordinates are out of bounds
     */
    public boolean checkDestination(int x, int y) {
        if (x < 0 || x >= width || y < 0 || y >= height) {
            System.err.println("World.java - checkDestination: Invalid position (" + x + ", " + y + ") for checking destination");
            return false;
        }

        for (Actor actor : worldMap.get(y).get(x)) {
            if (actor instanceof Destination) {
                return true;
            }
        }
        return false;
    }

    /**
     * Checks if there is an item at the specified coordinates in the world.
     *
     * @param x the x-coordinate to check
     * @param y the y-coordinate to check
     * @return true if there is an item at the specified coordinates, false otherwise
     * @throws IllegalArgumentException if the specified coordinates are out of bounds
     */
    public boolean checkItem(int x, int y) {
        if (x < 0 || x >= width || y < 0 || y >= height) {
            System.err.println("World.java - checkItem: Invalid position (" + x + ", " + y + ") for checking Item");
            return false;
        }

        for (Actor actor : worldMap.get(y).get(x)) {
            if (actor instanceof Item) {
                return true;
            }
        }
        return false;
    }

    /**
     * Removes an item from the specified position in the world.
     * 
     * @param x the x-coordinate of the position
     * @param y the y-coordinate of the position
     */
    public void removeItem(int x, int y) {
        if (x < 0 || x >= width || y < 0 || y >= height) {
            System.err.println("World.java - removeItem: Invalid position (" + x + ", " + y + ") for removing item");
            return;
        }

        List<Actor> actors = worldMap.get(y).get(x);
        for (int i = 0; i < actors.size(); i++) {
            if (actors.get(i).getType() == Actor.ActorType.ITEM) {
                actors.remove(i);
                SystemOutput.getInstance().outputRemoveItem(x, y);
                collectedItems++;
                SystemOutput.getInstance().outputInformation("Item removed. Total Items collected " + collectedItems + "/" + totalItems);
                return;
            }
        }

        System.err.println("World.java - removeItem: item not found at position (" + x + ", " + y + ")");
    }

    /**
     * Returns the width of the world.
     *
     * @return the width of the world
     */
    public int getWidth() {
        return width;
    }

    /**
     * Returns the height of the world.
     *
     * @return the height of the world
     */
    public int getHeight() {
        return height;
    }
}
