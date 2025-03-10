from Actor import Actor, ActorDirection, ActorType
from SystemOutput import SystemOutput

class Player(Actor):
    def __init__(self, x, y, direction, actor_type, world):
        """
        Initialize a new Player instance.

        Args:
            x (int): The x-coordinate of the player.
            y (int): The y-coordinate of the player.
            direction (str): The direction the player is facing.
            actor_type (str): The type of actor the player is.
            world (World): The world in which the player exists.
        """
        super().__init__(x, y, direction, actor_type, world)

    def act(self):
        """
        Perform an action for the player.
        """
        self.drive()
        self.drive()
        self.analyse_item()
        self.drive()
        self.drive()
        self.drive()
        self.drive()
        self.turn(ActorDirection.SOUTH)
        self.drive()
        self.analyse_item()
        self.drive()
        self.analyse_item()
        self.drive()
        self.turn(ActorDirection.EAST)
        self.drive()
        self.drive()
        self.drive()


    def drive(self):
        """
        Moves the player one step forward and checks if the player has reached the destination.
        
        This method calls the `move` method with a step value of 1 to move the player. 
        After moving, it checks if the player has reached the destination by calling the 
        `check_destination` method. If the player has reached the destination, it prints 
        a message indicating that the player has reached the destination.
        """
        self.move(1)
        if self.check_destination():
            print("Player has reached the destination.")

    def check_obstacle(self):
        """
        Checks if there is an obstacle in the direction the actor is currently facing.

        Returns:
            bool: True if there is an obstacle in the direction the actor is facing, False otherwise.
        """
        if self.actor_direction == ActorDirection.NORTH:
            return len(self.world.get_obstacles(self.x, self.y - 1)) > 0
        elif self.actor_direction == ActorDirection.EAST:
            return len(self.world.get_obstacles(self.x + 1, self.y)) > 0
        elif self.actor_direction == ActorDirection.SOUTH:
            return len(self.world.get_obstacles(self.x, self.y + 1)) > 0
        elif self.actor_direction == ActorDirection.WEST:
            return len(self.world.get_obstacles(self.x - 1, self.y)) > 0
        return False

    def check_obstacle_in_direction(self, direction):
        """
        Checks if there is an obstacle in the specified direction relative to the player's current position.

        Args:
            direction (ActorDirection): The direction to check for obstacles. 
                                        It should be one of the following: 
                                        ActorDirection.NORTH, ActorDirection.EAST, 
                                        ActorDirection.SOUTH, ActorDirection.WEST.

        Returns:
            bool: True if there is at least one obstacle in the specified direction, False otherwise.

        Notes:
            - If the world instance is not reachable, the function will print an error message and return False.
            - The function assumes that the world instance has a method `get_obstacles(x, y)` that returns a list of obstacles at the given coordinates.
        """
        if not self.world:
            print("Player.py - check_obstacle_in_direction: World instance is not reachable.")
            return False

        if direction == ActorDirection.NORTH:
            return len(self.world.get_obstacles(self.x, self.y - 1)) > 0
        elif direction == ActorDirection.EAST:
            return len(self.world.get_obstacles(self.x + 1, self.y)) > 0
        elif direction == ActorDirection.SOUTH:
            return len(self.world.get_obstacles(self.x, self.y + 1)) > 0
        elif direction == ActorDirection.WEST:
            return len(self.world.get_obstacles(self.x - 1, self.y)) > 0
        return False

    def check_world_bounds_in_direction(self, direction):
        """
        Checks if the player is within the world bounds in the given direction.

        Args:
            direction (ActorDirection): The direction in which to check the world bounds.

        Returns:
            bool: True if the player is out of bounds in the given direction, False otherwise.

        Notes:
            - If the world instance is not reachable, the function will print an error message and return False.
            - The directions are defined by the ActorDirection enum, which includes NORTH, EAST, SOUTH, and WEST.
        """
        if not self.world:
            print("Player.py - check_world_bounds_in_direction: World instance is not reachable.")
            return False

        if direction == ActorDirection.NORTH:
            return self.y - 1 < 0
        elif direction == ActorDirection.EAST:
            return self.x + 1 >= self.world.get_width()
        elif direction == ActorDirection.SOUTH:
            return self.y + 1 >= self.world.get_height()
        elif direction == ActorDirection.WEST:
            return self.x - 1 < 0
        return False

    def check_destination(self):
        """
        Checks if the player's current destination is valid.

        Returns:
            bool: False if there is a game error, otherwise the result of 
                  checking the destination coordinates (self.x, self.y) in the world.
        """
        if self.game_error:
            return False
        return self.world.check_destination(self.x, self.y)

    def check_item(self):
        """
        Checks if there is an item at the player's current position.

        Returns:
            bool: True if there is an item at the player's current position, False otherwise.
        """
        return self.world.check_item(self.x, self.y)

    def analyse_item(self):
        """
        Analyzes the current position for an item.

        If there is a game error, the method returns immediately.
        If an item is detected at the current position, it outputs a message indicating the detection
        and removes the item from the world. If no item is detected, it outputs a message indicating
        the absence of an item.

        Returns:
            None
        """
        if self.game_error:
            return

        if self.check_item():
            SystemOutput.get_instance().output_information("Item detected at current position.")
            self.world.remove_item(self.x, self.y)
        else:
            SystemOutput.get_instance().output_information("No item detected at current position.")
