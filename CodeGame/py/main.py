from World import World
from Actor import ActorType, ActorDirectionInWorld, ActorDirection
from Player import Player
from Destination import Destination
from Obstacle import Obstacle
from Item import Item

def get_actor_type(type_str):
    """
    Converts a string representation of an actor type to its corresponding ActorType enum value.

    Args:
        type_str (str): The string representation of the actor type. 
                        Expected values are "PLAYER", "DESTINATION", "OBSTACLE", or "ITEM".

    Returns:
        ActorType: The corresponding ActorType enum value.

    Raises:
        ValueError: If the provided type_str does not match any known actor type.
    """
    if type_str == "PLAYER":
        return ActorType.PLAYER
    elif type_str == "DESTINATION":
        return ActorType.DESTINATION
    elif type_str == "OBSTACLE":
        return ActorType.OBSTACLE
    elif type_str == "ITEM":
        return ActorType.ITEM
    else:
        raise ValueError("Unknown actor type")

def get_actor_direction(direction_str):
    """
    Converts a direction string to an ActorDirectionInWorld enum value.

    Args:
        direction_str (str): The direction as a string. Expected values are "NORTH", "EAST", "SOUTH", or "WEST".

    Returns:
        ActorDirectionInWorld: The corresponding ActorDirectionInWorld enum value.

    Raises:
        ValueError: If the direction_str is not one of the expected values.
    """
    if direction_str == "NORTH":
        return ActorDirectionInWorld.NORTH
    elif direction_str == "EAST":
        return ActorDirectionInWorld.EAST
    elif direction_str == "SOUTH":
        return ActorDirectionInWorld.SOUTH
    elif direction_str == "WEST":
        return ActorDirectionInWorld.WEST
    else:
        raise ValueError("Unknown actor direction")

def parse_txt(txt_string):
    """
    Parses a text string representing a game world configuration and returns the world dimensions and actors.

    Args:
        txt_string (str): A string containing the world configuration. The string should have lines in the following format:
            - "world <width> <height>": Defines the dimensions of the world.
            - "actor <type> <x> <y> <direction>": Defines an actor with its type, position (x, y), and direction.

    Returns:
        tuple: A tuple containing:
            - world_width (int): The width of the world.
            - world_height (int): The height of the world.
            - actors (list): A list of dictionaries, each representing an actor with the following keys:
                - "type" (str): The type of the actor.
                - "x" (int): The x-coordinate of the actor.
                - "y" (int): The y-coordinate of the actor.
                - "direction" (str): The direction the actor is facing.
    """
    lines = txt_string.strip().split("\n")
    world_width = 0
    world_height = 0
    actors = []
    for line in lines:
        parts = line.split()
        if parts[0] == "world":
            world_width = int(parts[1])
            world_height = int(parts[2])
        elif parts[0] == "actor":
            actor = {
                "type": parts[1],
                "x": int(parts[2]),
                "y": int(parts[3]),
                "direction": parts[4]
            }
            actors.append(actor)
    return world_width, world_height, actors

def parse_grid(grid_string):
    """
    Parses a grid string representation into a list of actors and the dimensions of the grid.

    Args:
        grid_string (str): A string representation of the grid where each character represents
                           an element in the grid. 'P' for PLAYER, 'O' for OBSTACLE, 'D' for DESTINATION,
                           and 'I' for ITEM.

    Returns:
        tuple: A tuple containing:
            - world_width (int): The width of the grid.
            - world_height (int): The height of the grid.
            - actors (list): A list of dictionaries, each representing an actor with the following keys:
                - type (str): The type of the actor ('PLAYER', 'OBSTACLE', 'DESTINATION', 'ITEM').
                - x (int): The x-coordinate of the actor.
                - y (int): The y-coordinate of the actor.
                - direction (str): The direction the actor is facing, default is 'EAST'.
    """
    lines = grid_string.strip().split("\n")
    world_width = len(lines[0])
    world_height = len(lines)
    actors = []
    for y, line in enumerate(lines):
        for x, char in enumerate(line):
            if char in "PODI":
                actor = {
                    "type": {
                        "P": "PLAYER",
                        "O": "OBSTACLE",
                        "D": "DESTINATION",
                        "I": "ITEM"
                    }[char],
                    "x": x,
                    "y": y,
                    "direction": "EAST"  # Default direction
                }
                actors.append(actor)
    return world_width, world_height, actors

def main():
    """
    Main function to initialize and run the game world.

    This function reads the game grid configuration from a file, parses it to
    extract the world dimensions and actor details, initializes the game world,
    adds actors to the world, runs the game, and determines the success of the game.

    The game grid configuration file should be named "game.grid.txt" and located
    in the same directory as this script.

    The expected format of the game grid configuration file is:
    - The first line contains the world width and height separated by a space.
    - Subsequent lines contain actor details in the format:
      type direction x y

    Raises:
        FileNotFoundError: If the game grid configuration file is not found.
        ValueError: If the game grid configuration file contains invalid data.
    """
    with open("game.grid.txt", "r") as file:
        txt_string = file.read()

    world_width, world_height, actors = parse_grid(txt_string)

    world = World(world_width, world_height)

    for actor in actors:
        world.add_object(
            get_actor_type(actor["type"]),
            get_actor_direction(actor["direction"]),
            actor["x"],
            actor["y"]
        )

    world.run()
    world.determine_success()

if __name__ == "__main__":
    main()
