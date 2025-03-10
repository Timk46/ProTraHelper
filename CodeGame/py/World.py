from Actor import Actor, ActorType, ActorDirection
from Player import Player
from Obstacle import Obstacle
from Destination import Destination
from Item import Item
from SystemOutput import SystemOutput

class World:
    def __init__(self, width, height):
        """
        Initializes a new instance of the World class.

        Args:
            width (int): The width of the world.
            height (int): The height of the world.

        Attributes:
            width (int): The width of the world.
            height (int): The height of the world.
            world_map (list): A 2D list representing the world map, where each cell contains a list.
            total_items (int): The total number of items in the world.
            collected_items (int): The number of items collected so far.
        """
        self.width = width
        self.height = height
        self.world_map = [[[] for _ in range(width)] for _ in range(height)]
        self.total_items = 0
        self.collected_items = 0

    def print_world(self):
        """
        Prints the current state of the world map to the console.

        The world map is represented as a 2D grid where each cell can contain multiple actors.
        The method iterates through each cell in the grid and prints a character representing
        the type of actor present in the cell:
        - "." for an empty cell
        - "P" for a player
        - "O" for an obstacle
        - "D" for a destination
        - "I" for an item

        If a cell contains multiple actors, the character for the last actor in the cell is printed.

        Returns:
            None
        """
        for row in self.world_map:
            for cell in row:
                if not cell:
                    print(".", end="")
                else:
                    for actor in cell:
                        if actor.get_type() == ActorType.PLAYER:
                            print("P", end="")
                        elif actor.get_type() == ActorType.OBSTACLE:
                            print("O", end="")
                        elif actor.get_type() == ActorType.DESTINATION:
                            print("D", end="")
                        elif actor.get_type() == ActorType.ITEM:
                            print("I", end="")
            print()

    def add_object(self, actor_type, actor_direction, x, y):
        """
        Adds an object to the world map at the specified coordinates.

        Parameters:
        actor_type (ActorType): The type of the actor to be added (PLAYER, DESTINATION, OBSTACLE, ITEM).
        actor_direction (Direction): The direction the actor is facing.
        x (int): The x-coordinate on the world map.
        y (int): The y-coordinate on the world map.

        Returns:
        None

        Raises:
        ValueError: If the actor_type is not recognized.
        """
        if actor_type == ActorType.PLAYER:
            player = Player(x, y, actor_direction, actor_type, self)
            self.world_map[y][x].append(player)
        elif actor_type == ActorType.DESTINATION:
            destination = Destination(x, y, actor_direction, actor_type, self)
            self.world_map[y][x].append(destination)
        elif actor_type == ActorType.OBSTACLE:
            obstacle = Obstacle(x, y, actor_direction, actor_type, self)
            self.world_map[y][x].append(obstacle)
        elif actor_type == ActorType.ITEM:
            item = Item(x, y, actor_direction, actor_type, self)
            self.world_map[y][x].append(item)
            self.total_items += 1
        else:
            print("World.py - add_object: could not add the object")

    def run(self):
        """
        Executes the `act` method of the first actor of type `PLAYER` found in the world map.

        Iterates through each cell in the world map and checks each actor within the cell.
        If an actor of type `PLAYER` is found, its `act` method is called and the function returns.
        If no actor of type `PLAYER` is found, prints a message indicating that the actor was not found.

        Returns:
            None
        """
        for row in self.world_map:
            for cell in row:
                for actor in cell:
                    if actor.get_type() == ActorType.PLAYER:
                        actor.act()
                        return
        print("World.py - run: Actor not found in the world map")

    def move_object(self, player, new_x, new_y):
        """
        Moves the specified player object to a new position on the world map.

        Parameters:
        player (object): The player object to be moved.
        new_x (int): The new x-coordinate to move the player to.
        new_y (int): The new y-coordinate to move the player to.

        Returns:
        None

        Raises:
        ValueError: If the new position is out of the world map boundaries.
        """
        for row in self.world_map:
            for cell in row:
                if player in cell:
                    cell.remove(player)
                    break

        if 0 <= new_x < self.width and 0 <= new_y < self.height:
            self.world_map[new_y][new_x].append(player)
            SystemOutput.get_instance().output_move(new_x, new_y)
        else:
            print(f"World.py - move_object: Invalid position ({new_x}, {new_y}) for moving object")

    def determine_success(self):
        """
        Determines the success of the player's actions in the game.

        This method checks the player's position and evaluates whether the player has reached the destination
        and/or collected all items. It outputs relevant information and success status based on these conditions.

        The method performs the following steps:
        1. Finds the player's position in the world map.
        2. Checks if the player has left the play field and outputs a game over message if true.
        3. Checks if the player has reached the destination.
        4. Checks if the player has collected all items.
        5. Outputs information about the player's success or failure in reaching the destination and collecting items.
        6. Outputs the overall success status.

        Returns:
            None
        """
        player_position = self.find_player()
        if player_position == (-1, -1):
            print("World.py - determine_success: Player not found in the world map")
            return

        player = None
        for row in self.world_map:
            for cell in row:
                for actor in cell:
                    if actor.get_type() == ActorType.PLAYER:
                        player = actor
                        if player.get_game_error():
                            SystemOutput.get_instance().output_information("Player left the play field. Game over.")
                            SystemOutput.get_instance().output_success(0, self.total_items, self.collected_items)
                            return

        reached_destination = self.check_destination(player_position[0], player_position[1])
        collected_all_items = self.collected_items == self.total_items

        if reached_destination:
            if collected_all_items:
                SystemOutput.get_instance().output_information("Player reached the destination and collected all items.")
            else:
                SystemOutput.get_instance().output_information("Player reached the destination but did not collect all items.")
        else:
            if collected_all_items:
                SystemOutput.get_instance().output_information("Player did not reach the destination but collected all items.")
            else:
                SystemOutput.get_instance().output_information("Player did not reach the destination and did not collect all items.")

        SystemOutput.get_instance().output_success(1 if reached_destination else 0, self.total_items, self.collected_items)


    def find_player(self):
        """
        Finds the player's position in the world map.

        The method iterates through the world map, which is a 2D list where each cell
        contains a list of actors. It checks each actor's type to determine if it is
        the player.

        Returns:
            tuple: A tuple (x, y) representing the player's coordinates in the world map.
                   If the player is not found, returns (-1, -1).
        """
        for y, row in enumerate(self.world_map):
            for x, cell in enumerate(row):
                for actor in cell:
                    if actor.get_type() == ActorType.PLAYER:
                        return (x, y)
        return (-1, -1)

    def get_obstacles(self, x, y):
        """
        Retrieve a list of obstacles at the specified coordinates (x, y) in the world map.

        Args:
            x (int): The x-coordinate of the position to check for obstacles.
            y (int): The y-coordinate of the position to check for obstacles.

        Returns:
            list: A list of Obstacle instances present at the specified coordinates.
                   If the coordinates are out of bounds, an empty list is returned.

        Raises:
            None

        Notes:
            If the specified coordinates are out of the world map bounds, an error message
            is printed and an empty list is returned.
        """
        obstacles = []
        if 0 <= x < self.width and 0 <= y < self.height:
            for actor in self.world_map[y][x]:
                if isinstance(actor, Obstacle):
                    obstacles.append(actor)
        else:
            print(f"World.py - get_obstacles: Invalid position ({x}, {y}) for retrieving obstacles")
        return obstacles

    def check_destination(self, x, y):
        """
        Check if the specified coordinates (x, y) contain a Destination object.

        Args:
            x (int): The x-coordinate to check.
            y (int): The y-coordinate to check.

        Returns:
            bool: True if the coordinates contain a Destination object, False otherwise.
        """
        if 0 <= x < self.width and 0 <= y < self.height:
            for actor in self.world_map[y][x]:
                if isinstance(actor, Destination):
                    return True
        else:
            print(f"World.py - check_destination: Invalid position ({x}, {y}) for checking destination")
        return False

    def check_item(self, x, y):
        """
        Check if there is an item at the given coordinates (x, y) in the world map.

        Args:
            x (int): The x-coordinate to check.
            y (int): The y-coordinate to check.

        Returns:
            bool: True if there is an item at the specified coordinates, False otherwise.

        Notes:
            - The method prints an error message if the given coordinates are out of bounds.
        """
        if 0 <= x < self.width and 0 <= y < self.height:
            for actor in self.world_map[y][x]:
                if isinstance(actor, Item):
                    return True
        else:
            print(f"World.py - check_item: Invalid position ({x}, {y}) for checking item")
        return False

    def remove_item(self, x, y):
        """
        Removes an item from the specified position (x, y) in the world map.

        Parameters:
        x (int): The x-coordinate of the position from which to remove the item.
        y (int): The y-coordinate of the position from which to remove the item.

        Returns:
        None

        Notes:
        - If the position (x, y) is valid and contains an item, the item is removed,
          the collected items count is incremented, and appropriate output messages
          are generated.
        - If the position (x, y) is invalid, an error message is printed.
        """
        if 0 <= x < self.width and 0 <= y < self.height:
            for actor in self.world_map[y][x]:
                if isinstance(actor, Item):
                    self.world_map[y][x].remove(actor)
                    self.collected_items += 1
                    SystemOutput.get_instance().output_remove_item(x, y)
                    SystemOutput.get_instance().output_information(f"Item removed. Total Items collected {self.collected_items}/{self.total_items}")
                    return
        else:
            print(f"World.py - remove_item: Invalid position ({x}, {y}) for removing item")

    def get_width(self):
        """
        Returns the width of the world.

        Returns:
            int: The width of the world.
        """
        return self.width

    def get_height(self):
        """
        Returns the height of the world.

        Returns:
            int: The height of the world.
        """
        return self.height

    def clear(self):
        """
        Clears the world map by resetting it to an empty state.

        This method reinitializes the world map to a 2D list of empty lists,
        where the dimensions are defined by the width and height attributes
        of the World object.
        """
        self.world_map = [[[] for _ in range(self.width)] for _ in range(self.height)]
