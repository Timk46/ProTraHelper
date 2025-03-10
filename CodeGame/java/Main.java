package game;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class Main {
    /**
     * The main method serves as the entry point for the application.
     * It reads a grid configuration from a file, parses the grid to extract
     * dimensions and actor data, initializes a world with the given dimensions,
     * adds actors to the world, and then runs the simulation.
     *
     * @param args Command line arguments (not used).
     */
    public static void main(String[] args) {
        String filePath = "game.grid.txt";
        StringBuilder txtString = new StringBuilder();

        try (BufferedReader br = new BufferedReader(new FileReader(filePath))) {
            String line;
            while ((line = br.readLine()) != null) {
                txtString.append(line).append("\n");
            }
        } catch (IOException e) {
            System.err.println("Could not open game.grid.txt");
            return;
        }

        int worldWidth = 0;
        int worldHeight = 0;
        List<ActorData> actors = new ArrayList<>();

        int[] dimensions = parseGrid(txtString.toString(), actors);
        worldWidth = dimensions[0];
        worldHeight = dimensions[1];

        World world = new World(worldWidth, worldHeight);

        for (ActorData actor : actors) {
            world.addObject(getActorType(actor.type), getActorDirection(actor.direction), actor.x, actor.y);
        }

        world.run();
        world.determineSuccess();
    }

    /**
     * Parses a grid string and extracts actor data.
     *
     * @param gridString the string representation of the grid, where each character represents a cell
     * @param actors the list to store the extracted actor data
     * @return an array containing the width and height of the grid
     *
     * The grid string is expected to have the following characters:
     * - 'P' for PLAYER
     * - 'O' for OBSTACLE
     * - 'D' for DESTINATION
     * - 'I' for ITEM
     *
     * Each actor's type, position (x, y), and default direction ("EAST") are stored in the provided actors list.
     */
    private static int[] parseGrid(String gridString, List<ActorData> actors) {
        int worldWidth = 0;
        int worldHeight = 0;
        String[] lines = gridString.split("\n");
        int y = 0;
        for (String line : lines) {
            if (worldWidth == 0) {
                worldWidth = line.length();
            }
            for (int x = 0; x < line.length(); x++) {
                char cell = line.charAt(x);
                if (cell == 'P' || cell == 'O' || cell == 'D' || cell == 'I') {
                    ActorData actor = new ActorData();
                    switch (cell) {
                        case 'P':
                            actor.type = "PLAYER";
                            break;
                        case 'O':
                            actor.type = "OBSTACLE";
                            break;
                        case 'D':
                            actor.type = "DESTINATION";
                            break;
                        case 'I':
                            actor.type = "ITEM";
                            break;
                    }
                    actor.x = x;
                    actor.y = y;
                    actor.direction = "EAST"; // Default direction
                    actors.add(actor);
                }
            }
            y++;
        }
        worldHeight = y;
        return new int[]{worldWidth, worldHeight};
    }

    /**
     * Returns the corresponding ActorType for the given type string.
     *
     * @param type the type of the actor as a string. Valid values are "PLAYER", "DESTINATION", "OBSTACLE", and "ITEM".
     * @return the corresponding ActorType enum value.
     * @throws IllegalArgumentException if the provided type string does not match any known actor type.
     */
    private static Actor.ActorType getActorType(String type) {
        switch (type) {
            case "PLAYER":
                return Actor.ActorType.PLAYER;
            case "DESTINATION":
                return Actor.ActorType.DESTINATION;
            case "OBSTACLE":
                return Actor.ActorType.OBSTACLE;
            case "ITEM":
                return Actor.ActorType.ITEM;
            default:
                throw new IllegalArgumentException("Unknown actor type");
        }
    }

    /**
     * Converts a string representation of a direction to the corresponding ActorDirection enum.
     *
     * @param direction the string representation of the direction (e.g., "NORTH", "EAST", "SOUTH", "WEST")
     * @return the corresponding ActorDirection enum value
     * @throws IllegalArgumentException if the provided direction is not recognized
     */
    private static Actor.ActorDirection getActorDirection(String direction) {
        switch (direction) {
            case "NORTH":
                return Actor.ActorDirection.NORTH;
            case "EAST":
                return Actor.ActorDirection.EAST;
            case "SOUTH":
                return Actor.ActorDirection.SOUTH;
            case "WEST":
                return Actor.ActorDirection.WEST;
            default:
                throw new IllegalArgumentException("Unknown actor direction");
        }
    }

    /**
     * The ActorData class represents the data for an actor in the game.
     * It contains information about the actor's type, position, and direction.
     */
    private static class ActorData {
        String type;
        int x;
        int y;
        String direction;
    }
}
