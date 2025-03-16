package game;

public class Destination extends Actor {
    /**
     * Constructs a new Destination object with the specified coordinates, direction, actor type, and world.
     *
     * @param x the x-coordinate of the destination
     * @param y the y-coordinate of the destination
     * @param actorDirectionInWorld the direction the actor is facing
     * @param actorType the type of the actor
     * @param world the world in which the destination exists
     */
    public Destination(int x, int y, ActorDirectionInWorld actorDirectionInWorld, ActorType actorType, World world) {
        super(x, y, actorDirectionInWorld, actorType, world);
    }

    /**
     * This method is overridden to define the action for the Destination class.
     * In this case, the Destination does not perform any actions.
     */
    @Override
    public void act() {
        // Destination does not act
    }
}
