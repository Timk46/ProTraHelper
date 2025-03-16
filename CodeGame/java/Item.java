package game;

public class Item extends Actor {
    /**
     * Constructs a new Item with the specified position, direction, type, and world.
     *
     * @param x the x-coordinate of the item
     * @param y the y-coordinate of the item
     * @param actorDirectionInWorld the direction the item is facing
     * @param actorType the type of the actor
     * @param world the world in which the item exists
     */
    public Item(int x, int y, ActorDirectionInWorld actorDirectionInWorld, ActorType actorType, World world) {
        super(x, y, actorDirectionInWorld, actorType, world);
    }

    /**
     * This method is overridden to define the action of the item.
     * Currently, the item does not perform any actions.
     */
    @Override
    public void act() {
        // Item does not act
    }
}
