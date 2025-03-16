from enum import Enum
from SystemOutput import SystemOutput

class ActorType(Enum):
    """
    Enum class representing different types of actors in the game.

    Attributes:
        PLAYER (int): Represents the player character.
        OBSTACLE (int): Represents an obstacle in the game.
        DESTINATION (int): Represents the destination or goal in the game.
        ITEM (int): Represents an item that can be collected or used in the game.
    """
    PLAYER = 1
    OBSTACLE = 2
    DESTINATION = 3
    ITEM = 4

class ActorDirectionInWorld(Enum):
    """
    Enum class representing the four cardinal directions an actor can face.

    Attributes:
        NORTH (int): Represents the north direction with a value of 1.
        EAST (int): Represents the east direction with a value of 2.
        SOUTH (int): Represents the south direction with a value of 3.
        WEST (int): Represents the west direction with a value of 4.
    """
    NORTH = 1
    EAST = 2
    SOUTH = 3
    WEST = 4

class ActorDirection(Enum):
    """
    Enum class representing the two possible directions an actor can turn.

    Attributes:
        LEFT (int): Represents the left direction with a value of 1.
        RIGHT (int): Represents the right direction with a value of 2.
    """
    LEFT = 1
    RIGHT = 2

class Actor:
    def __init__(self, x, y, direction, actor_type, world):
        """
        Initialize an Actor object.

        Args:
            x (int): The x-coordinate of the actor.
            y (int): The y-coordinate of the actor.
            direction (str): The direction the actor is facing.
            actor_type (str): The type of the actor.
            world (World): The world in which the actor exists.
        """
        self.x = x
        self.y = y
        self.actor_direction = direction
        self.actor_type = actor_type
        self.world = world
        self.game_error = False

    def move(self, distance):
        """
        Moves the actor a specified distance in the current direction.

        Parameters:
        distance (int): The distance to move the actor.

        Returns:
        None

        Behavior:
        - If a game error has occurred, the method returns immediately.
        - If the actor is at the world boundary, outputs a warning and sets the game error flag.
        - If there is an obstacle in front of the actor, outputs an information message and does not move the actor.
        - Updates the actor's position based on the current direction (NORTH, EAST, SOUTH, WEST).
        - If the world instance is available, moves the actor within the world and updates the actor's coordinates.
        - If the world instance is not reachable, prints an error message.
        """
        if self.game_error:
            return

        if self.check_world_bounds():
            SystemOutput.get_instance().output_information("World boundary detected.")
            SystemOutput.get_instance().output_warning()
            self.game_error = True
            return

        if self.check_obstacle():
            SystemOutput.get_instance().output_information("Obstacle detected in front.")
            return

        new_x = self.x
        new_y = self.y

        if self.actor_direction == ActorDirectionInWorld.NORTH:
            new_y -= distance
        elif self.actor_direction == ActorDirectionInWorld.EAST:
            new_x += distance
        elif self.actor_direction == ActorDirectionInWorld.SOUTH:
            new_y += distance
        elif self.actor_direction == ActorDirectionInWorld.WEST:
            new_x -= distance

        if self.world:
            self.world.move_object(self, new_x, new_y)
            self.x = new_x
            self.y = new_y
        else:
            print("Actor.py - move: World instance is not reachable.")

    def turn(self, direction):
        """
        Changes the direction of the actor.

        Args:
            direction (ActorDirection): The new direction for the actor.
        """
        if self.game_error:
            return

        if (direction == ActorDirection.LEFT):
            if (self.actor_direction == ActorDirectionInWorld.NORTH):
                self.actor_direction = ActorDirectionInWorld.WEST
            elif (self.actor_direction == ActorDirectionInWorld.WEST):
                self.actor_direction = ActorDirectionInWorld.SOUTH
            elif (self.actor_direction == ActorDirectionInWorld.SOUTH):
                self.actor_direction = ActorDirectionInWorld.EAST
        elif (direction == ActorDirection.RIGHT):
            if (self.actor_direction == ActorDirectionInWorld.NORTH):
                self.actor_direction = ActorDirectionInWorld.EAST
            elif (self.actor_direction == ActorDirectionInWorld.EAST):
                self.actor_direction = ActorDirectionInWorld.SOUTH
            elif (self.actor_direction == ActorDirectionInWorld.SOUTH):
                self.actor_direction = ActorDirectionInWorld.WEST

        SystemOutput.get_instance().output_turn(self.get_direction_string())

    def check_obstacle(self):
        """
        Checks if there is an obstacle in the direction the actor is facing.

        Returns:
            bool: True if there is an obstacle in the direction the actor is facing, False otherwise.
        """
        if self.actor_direction == ActorDirectionInWorld.NORTH:
            return len(self.world.get_obstacles(self.x, self.y - 1)) > 0
        elif self.actor_direction == ActorDirectionInWorld.EAST:
            return len(self.world.get_obstacles(self.x + 1, self.y)) > 0
        elif self.actor_direction == ActorDirectionInWorld.SOUTH:
            return len(self.world.get_obstacles(self.x, self.y + 1)) > 0
        elif self.actor_direction == ActorDirectionInWorld.WEST:
            return len(self.world.get_obstacles(self.x - 1, self.y)) > 0
        return False

    def check_world_bounds(self):
        """
        Checks if the actor is within the bounds of the world.

        This method verifies if the actor's current position, based on its direction,
        is within the valid boundaries of the world. It returns False if the world
        instance is not reachable.

        Returns:
            bool: True if the actor is within the world bounds, False otherwise.
        """
        if not self.world:
            print("Actor.py - check_world_bounds: World instance is not reachable.")
            return False

        if self.actor_direction == ActorDirectionInWorld.NORTH:
            return self.y - 1 < 0
        elif self.actor_direction == ActorDirectionInWorld.EAST:
            return self.x + 1 >= self.world.get_width()
        elif self.actor_direction == ActorDirectionInWorld.SOUTH:
            return self.y + 1 >= self.world.get_height()
        elif self.actor_direction == ActorDirectionInWorld.WEST:
            return self.x - 1 < 0
        return False

    def get_x(self):
        """
        Returns the x-coordinate of the actor.

        Returns:
            int: The x-coordinate of the actor.
        """
        return self.x

    def get_y(self):
        """
        Returns the y-coordinate of the actor.

        Returns:
            int: The y-coordinate of the actor.
        """
        return self.y

    def get_direction(self):
        """
        Returns the current direction of the actor.

        Returns:
            str: The direction in which the actor is currently facing.
        """
        return self.actor_direction

    def get_direction_string(self):
        """
        Returns the string representation of the actor's current direction.

        The direction is determined by the `actor_direction` attribute, which is
        an instance of the `ActorDirection` enum. The possible return values are:
        - "NORTH" if the direction is `ActorDirectionInWorld.NORTH`
        - "EAST" if the direction is `ActorDirectionInWorld.EAST`
        - "SOUTH" if the direction is `ActorDirectionInWorld.SOUTH`
        - "WEST" if the direction is `ActorDirectionInWorld.WEST`

        Returns:
            str: The string representation of the actor's current direction, or
            an empty string if the direction is not recognized.
        """
        if self.actor_direction == ActorDirectionInWorld.NORTH:
            return "NORTH"
        elif self.actor_direction == ActorDirectionInWorld.EAST:
            return "EAST"
        elif self.actor_direction == ActorDirectionInWorld.SOUTH:
            return "SOUTH"
        elif self.actor_direction == ActorDirectionInWorld.WEST:
            return "WEST"
        return ""

    def get_type(self):
        """
        Returns the type of the actor.

        Returns:
            str: The type of the actor.
        """
        return self.actor_type

    def get_actor_type_string(self):
        """
        Returns the string representation of the actor type.

        Returns:
            str: The string representation of the actor type. Possible values are:
                 "PLAYER", "OBSTACLE", "DESTINATION", "ITEM", or an empty string if
                 the actor type does not match any known types.
        """
        if self.actor_type == ActorType.PLAYER:
            return "PLAYER"
        elif self.actor_type == ActorType.OBSTACLE:
            return "OBSTACLE"
        elif self.actor_type == ActorType.DESTINATION:
            return "DESTINATION"
        elif self.actor_type == ActorType.ITEM:
            return "ITEM"
        return ""

    def get_game_error(self):
        """
        Retrieve the current game error.

        Returns:
            str: The current game error message.
        """
        return self.game_error
