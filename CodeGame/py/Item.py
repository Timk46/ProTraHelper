from Actor import Actor, ActorType

class Item(Actor):
    def __init__(self, x, y, direction, actor_type, world):
        """
        Initialize an Item instance.

        Args:
            x (int): The x-coordinate of the item.
            y (int): The y-coordinate of the item.
            direction (str): The direction the item is facing.
            actor_type (str): The type of actor the item represents.
            world (World): The world in which the item exists.
        """
        super().__init__(x, y, direction, actor_type, world)

    def act(self):
        """
        Perform an action with the item.

        This method is intended to be overridden by subclasses.
        The default implementation does nothing.
        """
        # Item does not act
        pass
